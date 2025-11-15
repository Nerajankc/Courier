import google.generativeai as genai
import os
from PIL import Image
import io

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def analyze_product_image(image_data: bytes) -> str:
    """Analyze product image using Gemini Vision API and return description"""
    if not GEMINI_API_KEY:
        return "AI Description: Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
    
    try:
        # Use the newer Gemini 1.5 model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        prompt = """Analyze this product image and provide a detailed description. 
        Include: product name, color, size, shape, material, any visible text, brand logos, 
        unique features, and condition. Be specific and detailed as this will be used to match 
        lost products with found items."""
        
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        return f"AI Description Error: {str(e)}"

def match_product_description(search_description: str, product_descriptions: list) -> list:
    """Use Gemini to match search description with product descriptions"""
    if not GEMINI_API_KEY:
        # Fallback to simple keyword matching if API key not configured
        matches = []
        for desc in product_descriptions:
            combined_desc = f"{desc['user_desc']} {desc['ai_desc']}".lower()
            search_lower = search_description.lower()
            keywords = search_lower.split()
            matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
            score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
            if score >= 50:
                matches.append({
                    "product_id": desc['id'],
                    "match_score": int(score),
                    "reason": "Keyword match (Gemini API not configured)"
                })
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Format product descriptions for comparison
        products_text = "\n\n".join([
            f"Product {i+1}:\nUser Description: {desc['user_desc']}\nAI Description: {desc['ai_desc']}"
            for i, desc in enumerate(product_descriptions)
        ])
        
        prompt = f"""You are a product matching system. Compare the following search description 
        with the provided product descriptions and return a JSON array with match scores (0-100) 
        and brief reasoning for each product.

        Search Description: {search_description}

        Available Products:
        {products_text}

        Return JSON format:
        [
            {{"product_id": 1, "match_score": 85, "reason": "Brief explanation"}},
            {{"product_id": 2, "match_score": 45, "reason": "Brief explanation"}}
        ]
        
        Only include products with match_score >= 50. Return only valid JSON."""
        
        response = model.generate_content(prompt)
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response text
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            matches = json.loads(response_text)
            return matches
        except json.JSONDecodeError:
            # Fallback: create simple matches based on keyword overlap
            matches = []
            for i, desc in enumerate(product_descriptions):
                combined_desc = f"{desc['user_desc']} {desc['ai_desc']}".lower()
                search_lower = search_description.lower()
                # Simple keyword matching
                keywords = search_lower.split()
                matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
                score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
                if score >= 50:
                    matches.append({
                        "product_id": desc['id'],
                        "match_score": int(score),
                        "reason": "Keyword match found"
                    })
            return sorted(matches, key=lambda x: x['match_score'], reverse=True)
            
    except Exception as e:
        # Fallback matching
        matches = []
        for desc in product_descriptions:
            combined_desc = f"{desc['user_desc']} {desc['ai_desc']}".lower()
            search_lower = search_description.lower()
            keywords = search_lower.split()
            matches_found = sum(1 for keyword in keywords if keyword in combined_desc)
            score = min(100, (matches_found / len(keywords)) * 100) if keywords else 0
            if score >= 50:
                matches.append({
                    "product_id": desc['id'],
                    "match_score": int(score),
                    "reason": "Simple keyword match"
                })
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)

