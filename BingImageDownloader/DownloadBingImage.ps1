# Define the URL containing the JSON contents
$url = "http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US"

# Use Invoke-RestMethod to fetch the JSON content from the specified URL
$response = Invoke-RestMethod -Uri $url

# Extract the 'urlBase' field from the first object in the JSON array
$urlBase = $response.images[0].urlBase

# Construct the full URL by appending the prefix and suffix to the extracted 'urlBase'
$downloadUrl = "http://www.bing.com" + $urlBase + "_UHD.jpg"

# Extract the substring after the last equals character from $urlBase to form the filename
$filename = ($urlBase -split "=")[-1] + "_UHD.jpg"

# Define the path where the image will be saved
$savePath = "C:\wallpaper\$filename"

if (Test-Path $savePath) {
    Write-Host "File $savePath already exists. Exiting..."
    exit
}

# Use Invoke-WebRequest to download the image from the constructed URL
Invoke-WebRequest -Uri $downloadUrl -OutFile $savePath

Copy-Item $savePath "C:\software\home-two\wallpaper.jpg"
$copyright = $response.images[0].copyright
echo "{""description"":""$copyright""}" > "C:\software\home-two\wallpaper.json"

Get-ChildItem -Path "C:\wallpaper" -Filter "*UHD.jpg" | Where-Object { ($_.LastWriteTime -lt (Get-Date).AddMonths(-1)) } | Remove-Item -Force
