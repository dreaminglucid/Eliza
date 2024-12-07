#!/usr/bin/env python3

import os
from datetime import datetime

def should_exclude(dirname, exclude_patterns=None):
    if exclude_patterns is None:
        exclude_patterns = {'node_modules', '.dfx', '.azle', '.turbo', 'docs', '.vscode'}
    return any(pattern in dirname for pattern in exclude_patterns)

def generate_tree(startpath, output_file, exclude_patterns=None):
    if exclude_patterns is None:
        exclude_patterns = {'node_modules', '.git', '.dfx', '.azle', '.turbo', 'docs', '.vscode'}  # Updated patterns
    
    with open(output_file, 'w') as f:
        # Write header with timestamp
        f.write(f"Directory structure for: {os.path.abspath(startpath)}\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Excluded patterns: {', '.join(exclude_patterns)}\n")
        f.write("=" * 50 + "\n\n")
        
        for root, dirs, files in os.walk(startpath):
            # Remove excluded directories from dirs list
            dirs[:] = [d for d in dirs if not should_exclude(d, exclude_patterns)]
            
            # Skip this directory if it matches exclude patterns
            if should_exclude(root, exclude_patterns):
                continue
            
            # Calculate the current level
            level = root.replace(startpath, '').count(os.sep)
            indent = '│   ' * (level - 1) + '├── ' if level > 0 else ''
            
            # Write current directory
            f.write(f"{indent}{os.path.basename(root)}/\n")
            
            # Write all files in the current directory
            subindent = '│   ' * level + '├── '
            for i, file in enumerate(sorted(files)):
                if i == len(files) - 1 and len(dirs) == 0:  # Last file in last directory
                    subindent = '│   ' * level + '└── '
                f.write(f"{subindent}{file}\n")

if __name__ == "__main__":
    output_file = "directory_structure.txt"
    # Updated exclude patterns to include .vscode
    exclude_patterns = {
        'node_modules',
        '.git',
        '.dfx',
        '.azle',
        '.turbo',
        'docs',
        '.vscode'
    }
    generate_tree(".", output_file, exclude_patterns)
    print(f"Directory structure has been saved to {output_file}")