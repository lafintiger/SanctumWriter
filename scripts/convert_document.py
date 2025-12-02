#!/usr/bin/env python3
"""
Simple document conversion script using Docling.
Called from Node.js to convert PDFs and other documents to Markdown.

Usage:
    python scripts/convert_document.py <input_file> [output_file]
    
If output_file is not specified, outputs to stdout as JSON.
"""

import sys
import json
import os
from pathlib import Path

def convert_document(input_path: str, output_path: str = None):
    """Convert a document to Markdown using Docling."""
    try:
        from docling.document_converter import DocumentConverter
    except ImportError:
        return {
            "success": False,
            "error": "Docling not installed. Run: pip install docling"
        }
    
    if not os.path.exists(input_path):
        return {
            "success": False,
            "error": f"File not found: {input_path}"
        }
    
    try:
        # Convert the document
        converter = DocumentConverter()
        result = converter.convert(input_path)
        
        # Export to markdown
        markdown_content = result.document.export_to_markdown()
        
        # Get metadata
        doc = result.document
        metadata = {
            "title": getattr(doc, 'title', None) or Path(input_path).stem,
            "pages": getattr(doc, 'num_pages', None),
            "source_file": os.path.basename(input_path),
        }
        
        # Save to file if output path specified
        saved_path = None
        if output_path:
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            saved_path = output_path
        
        return {
            "success": True,
            "markdown": markdown_content,
            "metadata": metadata,
            "saved_path": saved_path,
            "character_count": len(markdown_content),
            "word_count": len(markdown_content.split()),
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python convert_document.py <input_file> [output_file]"
        }))
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = convert_document(input_file, output_file)
    print(json.dumps(result))
    
    sys.exit(0 if result["success"] else 1)





