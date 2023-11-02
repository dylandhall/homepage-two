# Define the source and destination folders directly in the script
$sourceFolder = "C:\code\home2\home-two\dist\home-two"
$destinationFolder = "C:\software\home-two"

# Delete files in destination matching the regex pattern
Get-ChildItem -Path $destinationFolder -File | Where-Object { $_.Name -match "\w+\.[a-f0-9]{16}\.\w+" } | Remove-Item -Force

# Copy files from source to destination excluding 'Bookmarks'
Copy-Item -Path "$sourceFolder\*" -Destination $destinationFolder -Exclude 'Bookmarks' -Force