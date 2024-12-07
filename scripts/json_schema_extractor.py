import json
from typing import Any, Union

def extract_schema(data: Any) -> Any:
    """
    Recursively processes a JSON structure and removes text entries while preserving the schema.
    
    Args:
        data: Any JSON-compatible Python object
        
    Returns:
        The schema structure with placeholder values
    """
    if isinstance(data, dict):
        return {key: extract_schema(value) for key, value in data.items()}
    elif isinstance(data, list):
        if len(data) > 0:
            # For lists, we'll keep just the schema of the first item as an example
            return [extract_schema(data[0])]
        return []
    elif isinstance(data, str):
        return "string"
    elif isinstance(data, bool):
        return True
    elif isinstance(data, (int, float)):
        return 0
    elif data is None:
        return None
    else:
        return f"unknown_type_{type(data).__name__}"

def process_json_file(input_file: str, output_file: str) -> None:
    """
    Process a JSON file to extract its schema and save it to a new file.
    
    Args:
        input_file: Path to the input JSON file
        output_file: Path where the schema will be saved
    """
    try:
        # Read the input JSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract the schema
        schema = extract_schema(data)
        
        # Write the schema to the output file with nice formatting
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(schema, f, indent=2)
            
        print(f"Schema successfully extracted and saved to {output_file}")
        
    except FileNotFoundError:
        print(f"Error: Could not find the input file '{input_file}'")
    except json.JSONDecodeError:
        print(f"Error: '{input_file}' contains invalid JSON")
    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")

def main():
    # Example usage with correct path from scripts folder
    input_file = "../characters/beff.json"
    output_file = "beff_schema.json"
    process_json_file(input_file, output_file)

if __name__ == "__main__":
    main()