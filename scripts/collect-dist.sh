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
        
        # Find all JS files in the package's dist directory and fix imports
        find "dist/$package_name" -type f -name "*.js" -exec sed -i'.bak' \
            -e 's/@ai16z\/eliza/..\/core/g' \
            -e 's/from "node:path"/from "..\/polyfills\/path.js"/g' \
            -e 's/from '\''node:path'\''/from '\''..\/polyfills\/path.js'\''/g' \
            {} +
            
        # Clean up backup files
        find "dist/$package_name" -name "*.bak" -delete
    fi
done

# Create polyfills directory and add path polyfill
mkdir -p dist/polyfills
cat > dist/polyfills/path.js << 'EOF'
export const dirname = (path) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
};
export const resolve = (...paths) => paths.join('/').replace(/\/+/g, '/');
export default { dirname, resolve };
EOF

# Create an index.js that exports all packages
echo "Creating root index.js..."
echo "// Auto-generated index file for Internet Computer deployment" > dist/index.js
for package in dist/*/; do
    package_name=$(basename $package)
    # Skip the core and polyfills packages in the exports
    if [ "$package_name" != "core" ] && [ "$package_name" != "polyfills" ]; then
        echo "export * as $package_name from './$package_name';" >> dist/index.js
    fi
done

# If core package exists, export it differently
if [ -d "dist/core" ]; then
    echo "export * from './core';" >> dist/index.js
fi

echo "Build collection complete!"