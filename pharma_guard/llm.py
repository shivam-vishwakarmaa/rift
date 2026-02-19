import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def get_explanation(drug, phenotype, variants):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return get_fallback(phenotype, "Missing API Key")
    
    api_key = api_key.strip().replace('"', '').replace("'", "")
    host = "https://generativelanguage.googleapis.com"
    
    # --- STEP 1: AUTO-DISCOVER AVAILABLE MODELS ---
    try:
        models_url = f"{host}/v1beta/models?key={api_key}"
        models_res = requests.get(models_url)
        models_data = models_res.json()
        
        valid_models = [
            m['name'] for m in models_data.get('models', []) 
            if 'generateContent' in m.get('supportedGenerationMethods', [])
        ]
        
        if not valid_models:
            return get_fallback(phenotype, "API Key has no access to any generative models.")
            
        target_model = next((m for m in valid_models if 'flash' in m), valid_models[0])
        print(f"SUCCESS: Auto-selected model -> {target_model}")
        
    except Exception as e:
        print(f"Model Discovery Error: {e}")
        target_model = "models/gemini-1.5-flash"

    # --- STEP 2: THE "FAKE RAG" CONTEXT INJECTION ---
    clinical_knowledge = {
        "Poor metabolizer": f"{drug} metabolism is severely impaired. For prodrugs (like Codeine or Clopidogrel), this means the drug cannot convert to its active form, making it ineffective. For active drugs (like Warfarin or Fluorouracil), this means the drug builds up in the blood, causing severe toxicity.",
        "Intermediate metabolizer": f"Reduced metabolism of {drug}. This creates a moderate risk of toxicity for active drugs, or mildly reduced efficacy for prodrugs. Dosage adjustments are strictly required.",
        "Normal metabolizer": f"Standard enzymatic metabolism. {drug} can be processed normally. Standard CPIC dosing guidelines apply.",
        "Rapid metabolizer": f"Accelerated metabolism. Prodrugs may convert too quickly (causing toxicity), while active drugs may be cleared too fast (causing ineffectiveness).",
        "Ultrarapid metabolizer": f"Greatly accelerated metabolism. High risk of severe, life-threatening toxicity for prodrugs like Codeine due to massive rapid conversion to morphine."
    }

    # Grab the specific medical truth for this patient's phenotype
    context = clinical_knowledge.get(phenotype, "Standard pharmacogenomic pathway for this phenotype.")

    # Force the AI to use ONLY our context
    prompt = (
        f"You are an expert clinical pharmacogeneticist.\n"
        f"PATIENT PROFILE: Taking {drug}. Genetic phenotype: {phenotype}.\n\n"
        f"CLINICAL TRUTH (DO NOT DEVIATE): {context}\n\n"
        f"Using ONLY the clinical truth above, write a short explanation of the biological mechanism. "
        f"Return ONLY valid JSON with two keys: 'summary' (1 sentence) and 'mechanism' (brief biological explanation). "
        f"Do not include any markdown formatting, backticks, or extra text. Just the JSON."
    )
    
    url = f"{host}/v1beta/{target_model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    # --- STEP 3: EXECUTE ---
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code != 200:
            print(f"API Error {response.status_code}: {response.text}")
            return get_fallback(phenotype, f"Google API Error {response.status_code}")
            
        data = response.json()
        content_str = data['candidates'][0]['content']['parts'][0]['text']
        
        # Clean markdown if the AI disobeys instructions
        clean_json = content_str.strip()
        if clean_json.startswith("```json"): clean_json = clean_json[7:]
        if clean_json.startswith("```"): clean_json = clean_json[3:]
        if clean_json.endswith("```"): clean_json = clean_json[:-3]
            
        return json.loads(clean_json.strip())
        
    except Exception as e:
        print(f"LLM Python Error: {str(e)}")
        return get_fallback(phenotype, str(e))

def get_fallback(phenotype, error_msg):
    print(f"Fallback triggered due to: {error_msg}")
    return {
        "summary": f"Patient exhibits {phenotype} phenotype requiring clinical review.",
        "mechanism": f"LLM generation unavailable ({error_msg}). Refer to CPIC guidelines."
    }