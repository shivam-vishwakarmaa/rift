"""
Pure Python VCF Parser for PharmaGuard
RIFT 2026 Hackathon - Compliant with 6 genes requirement
"""

import re
from typing import List, Dict, Any

# Complete mapping of all target variants for 6 genes
TARGET_VARIANTS = {
    # CYP2D6 (Codeine, Tamoxifen)
    "rs1065852": {"gene": "CYP2D6", "allele": "*4", "function": "Poor metabolizer", "cpic_level": "A"},
    "rs3892097": {"gene": "CYP2D6", "allele": "*4", "function": "Poor metabolizer", "cpic_level": "A"},
    "rs5030655": {"gene": "CYP2D6", "allele": "*6", "function": "Poor metabolizer", "cpic_level": "A"},
    "rs5030865": {"gene": "CYP2D6", "allele": "*3", "function": "Poor metabolizer", "cpic_level": "A"},
    
    # CYP2C19 (Clopidogrel, Voriconazole)
    "rs4244285": {"gene": "CYP2C19", "allele": "*2", "function": "Loss of function", "cpic_level": "A"},
    "rs4986893": {"gene": "CYP2C19", "allele": "*3", "function": "Loss of function", "cpic_level": "A"},
    "rs12248560": {"gene": "CYP2C19", "allele": "*17", "function": "Gain of function", "cpic_level": "A"},
    
    # CYP2C9 (Warfarin, Phenytoin)
    "rs1799853": {"gene": "CYP2C9", "allele": "*2", "function": "Reduced function", "cpic_level": "A"},
    "rs1057910": {"gene": "CYP2C9", "allele": "*3", "function": "Reduced function", "cpic_level": "A"},
    "rs28371686": {"gene": "CYP2C9", "allele": "*5", "function": "Reduced function", "cpic_level": "A"},
    "rs9332131": {"gene": "CYP2C9", "allele": "*6", "function": "Reduced function", "cpic_level": "A"},
    
    # SLCO1B1 (Simvastatin)
    "rs4149056": {"gene": "SLCO1B1", "allele": "*5", "function": "Reduced function", "cpic_level": "A"},
    "rs2306283": {"gene": "SLCO1B1", "allele": "*1b", "function": "Normal function", "cpic_level": "A"},
    
    # TPMT (Azathioprine, Mercaptopurine)
    "rs1800462": {"gene": "TPMT", "allele": "*2", "function": "Loss of function", "cpic_level": "A"},
    "rs1800460": {"gene": "TPMT", "allele": "*3B", "function": "Loss of function", "cpic_level": "A"},
    "rs1142345": {"gene": "TPMT", "allele": "*3C", "function": "Loss of function", "cpic_level": "A"},
    
    # DPYD (Fluorouracil, Capecitabine)
    "rs3918290": {"gene": "DPYD", "allele": "*2A", "function": "Loss of function", "cpic_level": "A"},
    "rs55886062": {"gene": "DPYD", "allele": "*13", "function": "Loss of function", "cpic_level": "A"},
    "rs67376798": {"gene": "DPYD", "allele": "*9B", "function": "Reduced function", "cpic_level": "A"},
    "rs75017182": {"gene": "DPYD", "allele": "HapB3", "function": "Reduced function", "cpic_level": "A"},
}

# Drug-to-gene mapping
DRUG_GENE_MAP = {
    "CODEINE": ["CYP2D6"],
    "WARFARIN": ["CYP2C9", "VKORC1"],
    "CLOPIDOGREL": ["CYP2C19"],
    "SIMVASTATIN": ["SLCO1B1"],
    "AZATHIOPRINE": ["TPMT"],
    "FLUOROURACIL": ["DPYD"],
}

def parse_vcf_file(filepath: str) -> List[Dict[str, Any]]:
    """
    Parse VCF file and extract pharmacogenomic variants.
    Pure Python implementation - no external dependencies.
    """
    detected_variants = []
    
    try:
        with open(filepath, 'r') as f:
            for line in f:
                # Skip header lines
                if line.startswith('#'):
                    continue
                
                # Parse VCF columns
                cols = line.strip().split('\t')
                if len(cols) < 8:
                    continue
                
                chrom = cols[0]
                pos = cols[1]
                rsid = cols[2]
                ref = cols[3]
                alt = cols[4]
                qual = cols[5]
                filt = cols[6]
                info = cols[7]
                
                # Check if this is a target variant
                if rsid in TARGET_VARIANTS:
                    variant_info = TARGET_VARIANTS[rsid]
                    
                    # Extract genotype if sample data exists
                    genotype = "./."
                    if len(cols) >= 10:
                        sample_data = cols[9]
                        gt_field = sample_data.split(':')[0] if ':' in sample_data else sample_data
                        genotype = gt_field
                    
                    # Extract additional info from INFO field
                    gene = variant_info["gene"]
                    allele = variant_info["allele"]
                    function = variant_info["function"]
                    
                    # Try to get gene from INFO if available
                    gene_match = re.search(r'GENE=([^;]+)', info)
                    if gene_match:
                        gene = gene_match.group(1)
                    
                    detected_variants.append({
                        "rsid": rsid,
                        "gene": gene,
                        "allele": allele,
                        "function": function,
                        "cpic_level": variant_info["cpic_level"],
                        "genotype": genotype,
                        "chromosome": chrom,
                        "position": pos,
                        "ref": ref,
                        "alt": alt,
                        "quality": qual,
                        "filter": filt
                    })
        
        return detected_variants
        
    except Exception as e:
        print(f"VCF Parser Error: {e}")
        return []

def get_variants_by_gene(variants: List[Dict], gene: str) -> List[Dict]:
    """Filter variants by gene"""
    return [v for v in variants if v["gene"] == gene]

def get_diplotype(variants: List[Dict], gene: str) -> str:
    """Determine diplotype for a gene based on variants"""
    gene_variants = get_variants_by_gene(variants, gene)
    
    if not gene_variants:
        return "*1/*1"  # Default wild type
    
    # Simplified diplotype assignment
    alleles = []
    for v in gene_variants:
        if v["genotype"] == "1/1" or v["genotype"] == "1|1":
            alleles.append(v["allele"])
            alleles.append(v["allele"])
        elif v["genotype"] in ["0/1", "1/0", "0|1", "1|0"]:
            alleles.append("*1")
            alleles.append(v["allele"])
    
    if len(alleles) >= 2:
        return f"{alleles[0]}/{alleles[1]}"
    return "*1/*1"

def get_phenotype(gene: str, diplotype: str) -> str:
    """Determine phenotype based on gene and diplotype"""
    if "*2/*2" in diplotype or "*3/*3" in diplotype or "*4/*4" in diplotype:
        return "PM"  # Poor Metabolizer
    elif "*1/*2" in diplotype or "*1/*3" in diplotype or "*1/*4" in diplotype:
        return "IM"  # Intermediate Metabolizer
    elif "*1/*1" in diplotype:
        return "NM"  # Normal Metabolizer
    elif "*17/*17" in diplotype or "*1/*17" in diplotype:
        return "RM"  # Rapid Metabolizer
    else:
        return "Unknown"