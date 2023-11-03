# Miniserve wrapper

This is a windows service wrapper - I've called in miniserve wrapper but honestly any executable that you want to add as a windows service is fine to use, it takes the configuration on the commmand line.

Command line flags:

* `Filename` - full path for the file you want to run as a service
* `Arguments` - the arguments (if any) to pass to the program

Add it as a windows service using the `sc` command, in my case I used:

```
sc create MiniServeHomepageHost binPath= "C:\software\MiniserveWrapper\MiniserveWrapper.exe --FileName=""C:\software\miniserve\miniserve-0.24.0-x86_64-pc-windows-msvc.exe"" --Arguments=""C:\software\home-two\ --index index.html --spa --port 9839 -i 127.0.0.1""" start= auto
```

The miniserve server binary can be downloaded at [https://github.com/svenstaro/miniserve](https://github.com/svenstaro/miniserve)

I don't want to install IIS for a local homepage and I want it to be as light as possible so I can leave it running at all times.