#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define the destination directory inside ic/eliza_canister/
DEST_DIR="ic/eliza_canister/dist"

# Clean and create the destination dist directory
echo "Cleaning and setting up destination directory: $DEST_DIR"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy each package's dist to the destination dist directory
for package in packages/*/; do
    package_name=$(basename "$package")
    if [ -d "$package/dist" ]; then
        echo "Copying dist from $package_name..."
        # Create package-specific directory inside DEST_DIR
        mkdir -p "$DEST_DIR/$package_name"
        cp -r "$package/dist/"* "$DEST_DIR/$package_name/"
        
        # Find all JS files in the package's dist directory and fix imports
        find "$DEST_DIR/$package_name" -type f -name "*.js" -exec sed -i'.bak' \
            -e 's/@ai16z\/eliza/..\/core/g' \
            -e 's/from "node:path"/from "..\/polyfills\/path.js"/g' \
            -e "s/from 'node:path'/from '..\/polyfills\/path.js'/g" \
            {} +
            
        # Clean up backup files created by sed
        find "$DEST_DIR/$package_name" -name "*.bak" -delete
    fi
done

# Create polyfills directory and add path polyfill
echo "Creating polyfills directory and adding path polyfill..."
mkdir -p "$DEST_DIR/polyfills"
cat > "$DEST_DIR/polyfills/path.js" << 'EOF'
export const dirname = (path) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
};
export const resolve = (...paths) => paths.join('/').replace(/\/+/g, '/');
export default { dirname, resolve };
EOF

# Create an index.js that exports all packages
echo "Creating index.js inside $DEST_DIR..."
echo "// Auto-generated index file for Internet Computer deployment" > "$DEST_DIR/index.js"
for package in "$DEST_DIR"/*/; do
    package_name=$(basename "$package")
    # Skip the core and polyfills packages in the exports
    if [ "$package_name" != "core" ] && [ "$package_name" != "polyfills" ]; then
        echo "export * as $package_name from './$package_name';" >> "$DEST_DIR/index.js"
    fi
done

# If core package exists, export it differently
if [ -d "$DEST_DIR/core" ]; then
    echo "export * from './core';" >> "$DEST_DIR/index.js"
fi

echo "Build collection complete! Distribution files are located in $DEST_DIR."
