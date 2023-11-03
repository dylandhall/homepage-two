using System.Diagnostics;

namespace MiniserveWrapper;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IConfiguration _configuration;
    private Process? _process;

    public Worker(ILogger<Worker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        stoppingToken.Register(() => OnStopping());

        var filename = _configuration["FileName"];
        var args = _configuration["Arguments"];

        if (string.IsNullOrWhiteSpace(filename)) throw new Exception("File not provided");
        if (!File.Exists(filename)) throw new Exception("File not found");

        Console.WriteLine($"Running {filename} {args}");

        _process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = filename,
                Arguments = args??string.Empty,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        _process.OutputDataReceived += (sender, data) => { _logger.LogInformation(data.Data); };
        _process.ErrorDataReceived += (sender, data) => { _logger.LogError(data.Data); };

        _process.Start();

        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();
        
        Console.WriteLine("Process started");
        
        while (!stoppingToken.IsCancellationRequested && !_process.HasExited)
        {
            // Here, you can periodically check the process or do other tasks
            await Task.Delay(1000, stoppingToken);
        }

        Console.WriteLine("Process finished");

        if (!_process.HasExited)
        {
            _process.Kill();
        }
    }

    private void OnStopping()
    {
        Console.WriteLine("Process stopping");

        if (!(_process?.HasExited??true))
        {
            _process.Kill();
        }
    }
}
