using System.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace FileSyncService;

public class Worker : BackgroundService
{
    private readonly IConfiguration _configuration;
    
    public Worker(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var source = _configuration["Source"];
        var destination = _configuration["Destination"];

        if (string.IsNullOrWhiteSpace(source)) throw new Exception("File not provided");
        if (!File.Exists(source)) throw new Exception("File not found");

        if (!Path.Exists(Path.GetDirectoryName(destination??throw new Exception("Destination not provided")))) 
            throw new Exception("Path to copy to does not exist");

        File.Copy(source, destination, overwrite: true);

        using (var watcher = new FileSystemWatcher())
        {
            watcher.Path = Path.GetDirectoryName(source)!;
            watcher.Filter = Path.GetFileName(source);
            watcher.NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.CreationTime | NotifyFilters.Size;

            watcher.Changed += (sender, e) =>
            {
                // if there's a rename or delete, just don't do anything
                if (File.Exists(source))
                    File.Copy(source, destination, overwrite: true);
            };

            watcher.EnableRaisingEvents = true;

            Console.WriteLine($"Syncing {source} to {destination}");
            await Task.Delay(-1, stoppingToken);
        }
        
        Console.WriteLine("Exiting...");
    }

}
