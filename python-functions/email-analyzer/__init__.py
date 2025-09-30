import azure.functions as func
import json
import logging
from bs4 import BeautifulSoup
import re

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Email analyzer function processed a request.')

    try:
        # Get the email content from the request
        req_body = req.get_json()
        
        if not req_body or 'content' not in req_body:
            return func.HttpResponse(
                json.dumps({"error": "Email content is required"}),
                status_code=400,
                mimetype="application/json"
            )
        
        email_content = req_body['content']
        
        # Parse HTML content
        soup = BeautifulSoup(email_content, 'html.parser')
        
        # Extract links
        links = []
        for link in soup.find_all('a', href=True):
            links.append({
                'url': link['href'],
                'text': link.get_text().strip(),
                'type': categorize_link(link['href'])
            })
        
        # Extract text content
        text_content = soup.get_text()
        
        # Analyze content
        analysis = {
            'links': links,
            'text_length': len(text_content),
            'link_count': len(links),
            'has_tutorial_content': detect_tutorial_content(text_content),
            'vendor_links': [link for link in links if link['type'] == 'vendor'],
            'tutorial_links': [link for link in links if link['type'] == 'tutorial']
        }
        
        return func.HttpResponse(
            json.dumps(analysis),
            status_code=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        logging.error(f"Error processing email: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": "Internal server error"}),
            status_code=500,
            mimetype="application/json"
        )

def categorize_link(url):
    """Categorize links as tutorial, vendor, or general"""
    tutorial_indicators = ['tutorial', 'guide', 'learn', 'course', 'lesson', 'howto', 'docs']
    vendor_indicators = ['shop', 'buy', 'product', 'pricing', 'subscribe', 'signup', 'register']
    
    url_lower = url.lower()
    
    if any(indicator in url_lower for indicator in tutorial_indicators):
        return 'tutorial'
    elif any(indicator in url_lower for indicator in vendor_indicators):
        return 'vendor'
    else:
        return 'general'

def detect_tutorial_content(text):
    """Detect if content contains tutorial-related keywords"""
    tutorial_keywords = ['step', 'install', 'setup', 'configure', 'tutorial', 'guide', 'npm install', 'pip install']
    text_lower = text.lower()
    
    return any(keyword in text_lower for keyword in tutorial_keywords)