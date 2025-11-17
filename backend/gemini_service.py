import google.generativeai as genai
import os
from PIL import Image
import io
import json
from datetime import datetime, timedelta

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Load routes data
ROUTES_FILE = "routes.json"
def load_routes():
    try:
        with open(ROUTES_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

ROUTES = load_routes()

def analyze_product_image(image_data: bytes) -> str:
    """Analyze product image using Gemini Vision API and return description"""
    if not GEMINI_API_KEY:
        return "AI Description: Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
    
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        prompt = """Analyze this product image and provide a detailed description in the following format:

Type: [category, e.g., laptop, phone, bag, backpack, etc.]
Brand: [if visible, otherwise "Unknown"]
Color: [primary color(s) and any secondary colors]
Approximate Size: [dimensions or relative size description]
Estimated Weight: [light/medium/heavy or approximate weight]
Distinguishing Features:
- [Feature 1: e.g., scratches, dents, logos, stickers]
- [Feature 2: e.g., unique markings, serial numbers visible]
- [Feature 3: e.g., custom modifications, accessories attached]
- [Feature 4: e.g., wear patterns, discoloration]
- [Feature 5: e.g., text/writing visible]
- [Feature 6: e.g., any other unique identifiers]
- [Feature 7: e.g., additional notable characteristics]
Condition: [new/like new/good/fair/worn/damaged - with brief reason]

Be specific and detailed about identifying features. List 5-8 distinguishing features."""
        
        # Use Gemini 2.5 Flash - stable model for multimodal content
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        return f"AI Description Error: {str(e)}"

def match_product_with_conversation(conversation_history: list, product_descriptions: list) -> list:
    """Use Gemini AI to intelligently match products based on full conversation context"""
    if not GEMINI_API_KEY:
        return []
    
    if not product_descriptions:
        return []
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build conversation context
        conversation_text = "\n".join([
            f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
            for msg in conversation_history
        ])
        
        # Format all products with their descriptions
        # Combine courier description and AI analysis into one complete description
        products_list = []
        for idx, desc in enumerate(product_descriptions):
            # Merge user description, AI description, and image description
            full_description = []
            if desc.get('user_desc'):
                full_description.append(desc['user_desc'])
            if desc.get('ai_desc'):
                full_description.append(desc['ai_desc'])
            if desc.get('image_desc'):
                full_description.append(desc['image_desc'])
            
            combined_desc = ' | '.join(full_description) if full_description else 'No description available'
            
            product_info = f"""Product ID: {desc['id']}
Description: {combined_desc}"""
            products_list.append(product_info)
        
        products_text = "\n\n---\n\n".join(products_list)
        
        prompt = f"""You are an intelligent lost-and-found matching system. Analyze the ENTIRE conversation to understand what the user is looking for, then match it against available products.
        
        CONVERSATION HISTORY:
        {conversation_text}
        
        AVAILABLE PRODUCTS (already filtered by date and route):
        {products_text}
        
        TASK:
        Analyze the full conversation to understand what the user is looking for.
        Consider ALL details they've provided:
        - Text descriptions
        - Uploaded images and their analyses
        - Colors, sizes, brands, features, etc.
        
        Each product's description combines multiple sources (courier reports, AI analysis, user images).
        Match the user's requirements against these complete product descriptions.
        
        Return ONLY valid JSON in this exact format:
        [
          {{"product_id": <id>, "match_score": <0-100>, "reason": "Brief explanation of why it matches"}},
          ...
        ]
        
        Rules:
        - Only include products with match_score >= 40
        - Higher scores for more specific matches
        - Consider ALL user messages and image descriptions
        - If nothing matches well, return empty array []
        - Return ONLY the JSON array, no other text"""
        
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        
        # Clean up response text
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Remove any leading/trailing whitespace or newlines
        response_text = response_text.strip()
        
        matches = json.loads(response_text)
        
        # Validate response format
        if not isinstance(matches, list):
            return []
        
        # Ensure each match has required fields
        valid_matches = []
        for match in matches:
            if isinstance(match, dict) and 'product_id' in match and 'match_score' in match:
                valid_matches.append({
                    "product_id": match['product_id'],
                    "match_score": int(match['match_score']),
                    "reason": match.get('reason', 'Match found')
                })
        
        return sorted(valid_matches, key=lambda x: x['match_score'], reverse=True)
        
    except json.JSONDecodeError:
        return []
    except Exception:
        return []

def find_matching_routes(source: str, destination: str) -> list:
    """Find routes that connect source and destination"""
    matching_routes = []
    source_lower = source.lower().strip()
    dest_lower = destination.lower().strip()
    
    # Handle the new routes.json format
    routes_list = ROUTES.get('routes', []) if isinstance(ROUTES, dict) else ROUTES
    
    for route in routes_list:
        stops = route.get('stops', [])
        stops_lower = [stop.lower() for stop in stops]
        
        # Extract city and state from stops for flexible matching
        cities = []
        states = []
        for stop in stops_lower:
            parts = stop.split(',')
            if len(parts) >= 1:
                cities.append(parts[0].strip())
            if len(parts) >= 2:
                states.append(parts[1].strip())
        
        # Check if both source and destination are on the route
        # Match against full stop, city name, or state
        source_match = any(
            source_lower in stop or stop in source_lower or 
            source_lower in city or city in source_lower or
            source_lower in state or state in source_lower
            for stop, city, state in zip(stops_lower, cities + [''] * len(stops_lower), states + [''] * len(stops_lower))
            if stop or city or state
        )
        
        dest_match = any(
            dest_lower in stop or stop in dest_lower or
            dest_lower in city or city in dest_lower or
            dest_lower in state or state in dest_lower
            for stop, city, state in zip(stops_lower, cities + [''] * len(stops_lower), states + [''] * len(stops_lower))
            if stop or city or state
        )
        
        if source_match and dest_match:
            matching_routes.append(route)
    
    return matching_routes

def filter_by_route_and_date(products: list, source: str, destination: str, pickup_date: str) -> list:
    """Filter products based on route proximity and date"""
    if not source or not destination:
        return products
    
    # Get matching routes
    matching_routes = find_matching_routes(source, destination)
    if not matching_routes:
        # If no exact route match, return all products (fallback)
        return products
    
    # Get all locations on matching routes
    route_locations = set()
    for route in matching_routes:
        stops = route.get('stops', [])
        for stop in stops:
            stop_lower = stop.lower()
            route_locations.add(stop_lower)
            # Also add city and state separately for flexible matching
            parts = stop_lower.split(',')
            if len(parts) >= 1:
                route_locations.add(parts[0].strip())
            if len(parts) >= 2:
                route_locations.add(parts[1].strip())
    
    # Filter products by location
    filtered = []
    for product in products:
        if not product.get('source_location') or not product.get('destination_location'):
            # Include products without location data
            filtered.append(product)
            continue
        
        prod_source = product['source_location'].lower()
        prod_dest = product['destination_location'].lower()
        
        # Check if product locations match route
        source_match = any(loc in prod_source or prod_source in loc for loc in route_locations)
        dest_match = any(loc in prod_dest or prod_dest in loc for loc in route_locations)
        
        if source_match or dest_match:
            filtered.append(product)
    
    # Filter by date if provided
    # Items can only be found AFTER they were picked up, not before
    if pickup_date and filtered:
        try:
            search_date = datetime.strptime(pickup_date, "%Y-%m-%d")
            date_filtered = []
            for product in filtered:
                if product.get('pickup_date'):
                    try:
                        prod_date = datetime.strptime(product['pickup_date'], "%Y-%m-%d")
                        # Only include items reported on or after the tracking pickup date
                        # Allow items reported up to 30 days after pickup (reasonable lost-and-found window)
                        days_diff = (prod_date - search_date).days
                        if 0 <= days_diff <= 30:
                            date_filtered.append(product)
                    except:
                        # If date parsing fails, include the product to be safe
                        date_filtered.append(product)
                else:
                    # If product has no date, include it
                    date_filtered.append(product)
            return date_filtered if date_filtered else filtered
        except:
            pass
    
    return filtered if filtered else products

def conversational_search(message: str, conversation_history: list, tracking_info: dict, products: list) -> dict:
    """Handle conversational search with tracking information"""
    
    # All user input is treated as search criteria to help find their item
    # Success messages only appear when they claim an item via the frontend button
    
    # Check if we have all tracking info
    has_tracking = tracking_info.get('tracking_number')
    has_date = tracking_info.get('pickup_date')
    has_source = tracking_info.get('source_location')
    has_dest = tracking_info.get('destination_location')
    
    # If no tracking number, ask for it
    if not has_tracking:
        return {
            "message": "Hi there! To help you find your lost package, I'll need your tracking number. Could you please provide it?",
            "needs_tracking_info": True,
            "has_results": False,
            "matches": None
        }
    
    # If we don't have complete tracking info yet
    if not (has_tracking and has_date and has_source and has_dest):
        return {
            "message": f"Great! I have your tracking number: {tracking_info['tracking_number']}. The system will automatically look up your package route and shipping date. Please describe what your package looks like or what's inside it.",
            "needs_tracking_info": True,
            "has_results": False,
            "matches": None
        }
    
    # We have all info, perform search
    filtered_products = filter_by_route_and_date(
        products,
        tracking_info['source_location'],
        tracking_info['destination_location'],
        tracking_info['pickup_date']
    )
    
    if not filtered_products:
        return {
            "message": f"I've searched our system for items matching your tracking number {tracking_info['tracking_number']} on the route from {tracking_info['source_location']} to {tracking_info['destination_location']}, but I haven't found any matches yet. New items are added daily, so please check back soon.",
            "needs_tracking_info": False,
            "has_results": False,
            "matches": []
        }
    
    # Use AI to match based on FULL conversation context with filtered products
    product_descriptions = [
        {
            'id': p['id'],
            'user_desc': p.get('user_desc'),
            'ai_desc': p.get('ai_desc'),
            'image_desc': p.get('image_desc', '')
        }
        for p in filtered_products
    ]
    
    # Add the current message to conversation history for AI matching
    full_conversation = conversation_history + [{"role": "user", "content": message}]
    
    # Pass entire conversation (including current message) to AI for intelligent matching
    matches = match_product_with_conversation(full_conversation, product_descriptions)
    
    if matches:
        intro = f"Great news! I found {len(matches)} potential match(es) for your tracking number {tracking_info['tracking_number']}. "
        intro += "Please review the items below to see if any match what you're looking for:"
        
        return {
            "message": intro,
            "needs_tracking_info": False,
            "has_results": True,
            "matches": matches
        }
    else:
        return {
            "message": f"I've checked items found along your route ({tracking_info['source_location']} → {tracking_info['destination_location']}) around {tracking_info['pickup_date']}, but nothing closely matches your description yet. Can you provide more details about the item? For example, color, size, brand, or any unique features?",
            "needs_tracking_info": False,
            "has_results": False,
            "matches": []
        }

