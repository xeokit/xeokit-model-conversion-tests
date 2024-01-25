
#!/bin/bash

# Function to convert bytes to megabytes
bytes_to_mb() {
    local bytes=$1
    local mb=$(echo "scale=2; $bytes / (1024 * 1024)" | bc)
    echo "$mb"
}

# Function to recursively list files exceeding 50MB to check if any exceed GitHub limits
list_large_files() {
    local directory=$1

    find "$directory" -type f -size +50M -print0 |
    while IFS= read -r -d '' file; do
        size=$(stat -c %s "$file")
        size_mb=$(bytes_to_mb "$size")
        echo "File: $file Size: $size_mb MB"
    done
}

# Check if directory argument is provided, else use current directory
if [ $# -eq 0 ]; then
    directory="."
else
    directory="$1"
fi

list_large_files "$directory"