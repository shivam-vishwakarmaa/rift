from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import traceback
import datetime
import uuid
from typing import List, Optional
from parser import parse_vcf_file, TARGET_VARIANTS, DRUG_GENE_MAP
from engine import get_clinical_risk, CPIC_GUIDELINES
from llm import get_explanation

app = FastAPI(title="PharmaGuard API", description="Pharmacogenomic Risk Prediction System", version="2.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {
        "service": "PharmaGuard API",
        "version": "2.0",
        "status": "operational",
        "supported_drugs": list(DRUG_GENE_MAP.keys()),
        "supported_genes": list(set([v["gene"] for v in TARGET_VARIANTS.values()])),
        "cpic_guidelines": CPIC_GUIDELINES
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

@app.post("/analyze")
async def analyze(
    drug: str = Form(...),
    vcf: UploadFile = File(...),
    patient_id: Optional[str] = Form(None)
):
    """
    Analyze VCF file for pharmacogenomic risk associated with a specific drug.
    Returns complete JSON schema as required by RIFT 2026.
    """
    try:
        # Validate file type
        if not vcf.filename.endswith('.vcf'):
            raise HTTPException(status_code=400, detail="File must be a .vcf file")
        
        # Generate patient ID if not provided
        if not patient_id:
            patient_id = f"PATIENT_{uuid.uuid4().hex[:8].upper()}"
        
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{vcf.filename}")
        try:
            content = await vcf.read()
            
            # Check file size (5MB limit as per PS)
            if len(content) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
            
            with open(file_path, "wb") as buffer:
                buffer.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

        # Step 1: Parse VCF file
        try:
            variants = parse_vcf_file(file_path)
            parsing_success = True
            variants_count = len(variants)
        except Exception as e:
            variants = []
            parsing_success = False
            variants_count = 0
            print(f"Parsing error: {traceback.format_exc()}")

        # Step 2: Get clinical risk assessment
        try:
            risk = get_clinical_risk(variants, drug)
        except Exception as e:
            risk = {
                "label": "Unknown",
                "severity": "unknown",
                "phenotype": "Unknown",
                "diplotype": "*1/*1",
                "gene": "Unknown",
                "recommendation": "Error in risk assessment. Please try again.",
                "confidence_score": 0.0,
                "cpic_level": "N/A"
            }
            print(f"Risk engine error: {traceback.format_exc()}")

        # Step 3: Get LLM explanation
        try:
            explanation = get_explanation(drug, risk['phenotype'], variants)
        except Exception as e:
            explanation = {
                "summary": f"Patient exhibits {risk['phenotype']} phenotype for {drug}.",
                "mechanism": "LLM explanation temporarily unavailable. Please refer to CPIC guidelines."
            }
            print(f"LLM error: {traceback.format_exc()}")

        # Step 4: Clean up uploaded file (optional - can keep for debugging)
        try:
            os.remove(file_path)
        except:
            pass

        # Step 5: Build complete JSON response matching required schema
        response = {
            "patient_id": patient_id,
            "drug": drug.upper(),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "risk_assessment": {
                "risk_label": risk.get("label", "Unknown"),
                "confidence_score": risk.get("confidence_score", 0.5),
                "severity": risk.get("severity", "unknown")
            },
            "pharmacogenomic_profile": {
                "primary_gene": risk.get("gene", "Unknown"),
                "diplotype": risk.get("diplotype", "*1/*1"),
                "phenotype": risk.get("phenotype", "Unknown"),
                "detected_variants": [
                    {
                        "rsid": v["rsid"],
                        "gene": v["gene"],
                        "allele": v.get("allele", "Unknown"),
                        "function": v.get("function", "Unknown"),
                        "genotype": v["genotype"],
                        "chromosome": v["chromosome"],
                        "position": v["position"],
                        "cpic_level": v.get("cpic_level", "N/A")
                    } for v in variants
                ]
            },
            "clinical_recommendation": {
                "action": risk.get("recommendation", "Insufficient data for recommendation."),
                "guideline_source": CPIC_GUIDELINES.get(drug.upper(), "CPIC (Clinical Pharmacogenetics Implementation Consortium)"),
                "cpic_evidence_level": risk.get("cpic_level", "N/A"),
                "requires_physician_review": True
            },
            "llm_generated_explanation": {
                "summary": explanation.get("summary", ""),
                "mechanism": explanation.get("mechanism", ""),
                "citations": [
                    {
                        "rsid": v["rsid"],
                        "gene": v["gene"],
                        "dbSNP_url": f"https://www.ncbi.nlm.nih.gov/snp/{v['rsid']}"
                    } for v in variants[:5]  # Limit to 5 citations
                ]
            },
            "quality_metrics": {
                "vcf_parsing_success": parsing_success,
                "total_variants_analyzed": variants_count,
                "variants_detected": len(variants),
                "file_name": vcf.filename,
                "file_size_bytes": len(content)
            },
            "comprehensive_panel": await get_comprehensive_risk(variants, drug)
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        print("CRITICAL ERROR IN API:")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(e),
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        )

async def get_comprehensive_risk(variants: List[dict], primary_drug: str) -> dict:
    """
    Generate risk assessment for all 6 drugs (full panel screening)
    This runs silently in the background
    """
    all_drugs = ["CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"]
    panel = {}
    
    for drug in all_drugs:
        if drug == primary_drug.upper():
            continue  # Skip the primary drug (already analyzed)
        
        try:
            risk = get_clinical_risk(variants, drug)
            panel[drug] = {
                "risk_label": risk.get("label", "Unknown"),
                "severity": risk.get("severity", "unknown"),
                "gene": risk.get("gene", "Unknown"),
                "phenotype": risk.get("phenotype", "Unknown"),
                "confidence_score": risk.get("confidence_score", 0.5)
            }
        except:
            panel[drug] = {
                "risk_label": "Error",
                "severity": "unknown",
                "gene": "Unknown",
                "phenotype": "Unknown",
                "confidence_score": 0.0
            }
    
    return panel

@app.post("/analyze/batch")
async def analyze_batch(
    drugs: str = Form(...),
    vcf: UploadFile = File(...)
):
    """
    Analyze multiple drugs at once (comma-separated)
    """
    drug_list = [d.strip().upper() for d in drugs.split(',')]
    
    # Use the first drug for the main response
    primary_drug = drug_list[0]
    
    # Get primary analysis
    primary_response = await analyze(drug=primary_drug, vcf=vcf)
    
    # Add batch results
    if isinstance(primary_response, dict):
        primary_response["batch_analysis"] = {}
        for drug in drug_list[1:]:
            try:
                # Need to re-read file - in production, save and reuse
                # This is simplified for hackathon
                primary_response["batch_analysis"][drug] = "Batch analysis available in comprehensive_panel"
            except:
                pass
    
    return primary_response