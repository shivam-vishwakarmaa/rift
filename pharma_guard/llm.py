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
        
        # Find all models that this specific API key is allowed to use for text generation
        valid_models = [
            m['name'] for m in models_data.get('models', []) 
            if 'generateContent' in m.get('supportedGenerationMethods', [])
        ]
        
        if not valid_models:
            return get_fallback(phenotype, "API Key has no access to any generative models.")
            
        # Prefer a 'flash' model for speed, otherwise just use the first available one
        target_model = next((m for m in valid_models if 'flash' in m), valid_models[0])
        print(f"SUCCESS: Auto-selected model -> {target_model}")
        
    except Exception as e:
        print(f"Failed to auto-discover models: {e}")
        # Absolute newest fallback if discovery fails
        target_model = "models/gemini-2.0-flash" 
        
    # --- STEP 2: GENERATE THE EXPLANATION ---
    url = f"{host}/v1beta/{target_model}:generateContent?key={api_key}"
    
    prompt = (
        f"Act as a clinical pharmacologist. Explain why a patient "
        f"with a {phenotype} phenotype has altered risk for {drug}. "
        f"Provide the response strictly as a raw JSON object with exactly two keys: "
        f"'summary' (1 sentence) and 'mechanism' (brief biological explanation). "
        f"Do not include any markdown formatting, backticks, or extra text. Just the JSON."
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
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