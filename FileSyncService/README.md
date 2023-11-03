# Lightweight windows file sync service

This is a really light service to copy my bookmarks anytime they are updated, for use in my local homepage.

Compile and move it to a folder, eg `C:\software\BookmarkSync\`, then set up using:

```
sc create BookmarkFileSyncHost binPath= "C:\software\BookmarkSync\FileSyncService.exe --Source=""C:\Users\User\AppData\Local\Chromium\User Data\Profile 1\Bookmarks"" --Destination=""C:\software\home-two\Bookmarks""" start= auto
```