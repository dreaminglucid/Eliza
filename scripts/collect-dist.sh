#!/bin/bash

# Clean and create dist directory
rm -rf dist
mkdir -p dist

# Copy each package's dist to the root dist directory
for package in packages/*/; do
    package_name=$(basename $package)
    if [ -d "$package/dist" ]; then
        echo "Copying dist from $package_name..."
        # Create package-specific directory
        mkdir -p "dist/$package_name"
        cp -r "$package/dist/"* "dist/$package_name/"
    fi
done

# Create an index.js that exports all packages
echo "Creating root index.js..."
echo "// Auto-generated index file for Internet Computer deployment" > dist/index.js
for package in dist/*/; do
    package_name=$(basename $package)
    echo "export * as $package_name from './$package_name';" >> dist/index.js
done

echo "Build collection complete!"