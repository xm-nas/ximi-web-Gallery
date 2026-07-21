<?php
// ========== 处理 AJAX 流式扫描请求 ==========
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'scan') {
    // 禁用 PHP 及 Web 服务器的输出缓冲，实现实时流式日志
    @ini_set('output_buffering', 'off');
    @ini_set('zlib.output_compression', false);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no'); // 关键：关闭 Nginx 等反代工具的缓存
    
    // 【性能优化】强制设定内存限制为 256M 并解除执行超时，开启垃圾回收
    @ini_set('memory_limit', '256M');
    @set_time_limit(0);
    @gc_enable();

    // 填充一段空格强制 Web 服务器尽早刷新初始 Buffer
    echo str_pad(' ', 4096) . "\n";
    @ob_flush();
    flush();

    function sendData($type, $message = '') {
        $data = ['type' => $type, 'message' => $message];
        echo json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
        @ob_flush();
        flush();
    }

    $foldersJson = $_POST['folders'] ?? '[]';
    $folders = json_decode($foldersJson, true);
    if (!is_array($folders) || empty($folders)) {
        sendData('error', '未接收到有效的目录参数');
        exit;
    }

    // 获取配置文件名并过滤，防止跨目录写入
    $configName = $_POST['configName'] ?? '';
    $configName = trim($configName);
    if ($configName === '') {
        $fileName = 'setting.js';
    } else {
        $fileName = basename($configName) . '.js';
    }

    // $validExts = ['jpg','jpeg','png','gif','webp','mp4','webm','ogg','mov'];
    // 包含图片、视频以及所有 Web 支持的音频格式 (mp3, wav, m4a, aac, flac, opus, oga, weba)
$validExts = [
    // 图片格式
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    // 视频格式
    'mp4', 'webm', 'ogg', 'mov',
    // 音频格式 (新增)
    'mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'oga', 'weba'
];

    $tree = [];
    $totalFilesFound = 0; // 全局符合要求的文件计数器
    $gcCounter = 0;       // 垃圾回收计数器

    foreach ($folders as $folder) {
        $folder = trim($folder);
        if (empty($folder) || strpos($folder, '.') === 0 || strpos($folder, '/') !== false || strpos($folder, '\\') !== false) {
            continue;
        }
        
        $targetPath = __DIR__ . DIRECTORY_SEPARATOR . $folder;
        if (!is_dir($targetPath)) {
            continue;
        }

        sendData('log', "正在扫描目录: {$folder}");

        $dirIterator = new RecursiveDirectoryIterator($targetPath, RecursiveDirectoryIterator::SKIP_DOTS);
        $iterator = new RecursiveIteratorIterator($dirIterator);

        $folderFileCount = 0;

foreach ($iterator as $file) {
            if ($file->isFile()) {
                
                // 【新增】：排除群晖系统自动生成的 @eaDir 缓存目录
                if (strpos($file->getPathname(), '@eaDir') !== false) {
                    continue;
                }

                $ext = strtolower($file->getExtension());
                if (in_array($ext, $validExts)) {
                    $absolutePath = $file->getPathname();
                    $relPath = substr($absolutePath, strlen(__DIR__) + 1);
                    $relPath = str_replace('\\', '/', $relPath);

                    // ... 下面的代码保持不变 ...

                    $parts = explode('/', $relPath);
                    $dirParts = array_slice($parts, 0, -1);
                    $cur = &$tree;
                    
                    foreach ($dirParts as $dir) {
                        if (!isset($cur[$dir])) {
                            $cur[$dir] = [];
                        }
                        $cur = &$cur[$dir];
                    }
                    
                    if (!isset($cur['_images'])) {
                        $cur['_images'] = [];
                    }
                    $cur['_images'][] = $relPath;

                    $totalFilesFound++;
                    $folderFileCount++;

                    // 【性能优化】降低日志发送频率，每处理 50 个文件往前端发一次通知，大幅减轻网络 IO 和前端 DOM 负担
                    if ($totalFilesFound % 50 === 0) {
                        sendData('log', "已累计扫描到 {$totalFilesFound} 个文件...");
                    }

                    // 【内存优化】垃圾回收：每扫描完 50 个文件，清理一次迭代器中产生的临时变量
                    $gcCounter++;
                    if ($gcCounter % 50 === 0) {
                        gc_collect_cycles(); 
                    }
                }
            }
        }
        sendData('log', "{$folder} 目录扫描完成，共找到 {$folderFileCount} 个文件。");
    }

    sendData('log', '正在进行文件自然排序...');
    
    // 递归对图片路径按文件名进行自然排序
    function sortTree(&$node) {
        foreach ($node as $key => &$value) {
            if ($key === '_images') {
                usort($value, function($a, $b) {
                    $nameA = basename($a);
                    $nameB = basename($b);
                    return strnatcasecmp($nameA, $nameB); 
                });
            } elseif (is_array($value)) {
                sortTree($value);
            }
        }
    }

    sortTree($tree);

    $json = json_encode($tree, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    $jsOutput = "window._galleryConfigs = window._galleryConfigs || [];\nwindow._galleryConfigs.push({$json});";
    
    // 直接在服务端写入文件
    $savePath = __DIR__ . DIRECTORY_SEPARATOR . $fileName;
    $writeResult = @file_put_contents($savePath, $jsOutput);

    if ($writeResult !== false) {
        sendData('done', "✅ 配置文件已成功直接保存至当前目录: {$fileName}");
    } else {
        sendData('error', "写入文件失败！请检查当前目录是否具有写入权限 (例如 chmod 755)。目标文件: {$fileName}");
        sendData('done', "任务结束，但配置文件保存失败。");
    }
    exit;
}

// ========== 页面及 UI 渲染 ==========

$directories = array_filter(glob('*', GLOB_ONLYDIR), function($dir) {
    return strpos($dir, '.') !== 0; 
});
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>希米相册配置生成工具</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 20px; background: #f7f9fc; color: #333; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .control-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        input[type="text"] { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; width: 220px; font-size: 14px; }
        button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; background: #e2e8f0; color: #1e293b; transition: background 0.2s; }
        button:hover { background: #cbd5e1; }
        button.primary { background: #3b82f6; color: #fff; font-weight: bold; }
        button.primary:hover { background: #2563eb; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .folder-list { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; max-height: 300px; overflow-y: auto; }
        .folder-item { display: flex; align-items: center; gap: 6px; font-size: 15px; cursor: pointer; }
        textarea { width: 100%; height: 350px; padding: 12px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; box-sizing: border-box; background: #1e1e1e; color: #d4d4d4; }
    </style>
</head>
<body>

<div class="container">
    <h2>希米相册配置自动生成</h2>
    
    <div class="control-bar">
        <label>配置文件名: 
            <input type="text" id="configName" placeholder="为空时默认使用 setting">
        </label>
        <button type="button" onclick="selectAll(true)">全选</button>
        <button type="button" onclick="selectAll('invert')">反选</button>
        <button type="button" class="primary" id="generateBtn" onclick="startScan()">生成配置</button>
    </div>

    <div class="folder-list">
        <?php if (empty($directories)): ?>
            <div style="color: #888;">当前目录下没有找到任何文件夹。</div>
        <?php else: ?>
            <?php foreach ($directories as $dir): ?>
                <label class="folder-item">
                    <input type="checkbox" class="folder-checkbox" value="<?php echo htmlspecialchars($dir); ?>">
                    <?php echo htmlspecialchars($dir); ?>
                </label>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <textarea id="logBox" readonly placeholder="扫描日志将在这里实时显示..."></textarea>
</div>

<script>
    // 选区控制
    function selectAll(action) {
        const checkboxes = document.querySelectorAll('.folder-checkbox');
        checkboxes.forEach(cb => {
            if (action === true) {
                cb.checked = true;
            } else if (action === 'invert') {
                cb.checked = !cb.checked;
            }
        });
    }

    // 核心流式扫描
    async function startScan() {
        const checkboxes = document.querySelectorAll('.folder-checkbox:checked');
        const folders = Array.from(checkboxes).map(cb => cb.value);
        
        if (folders.length === 0) {
            alert('请至少勾选一个目录！');
            return;
        }

        const configNameInput = document.getElementById('configName').value.trim();
        const finalFileName = configNameInput ? configNameInput + '.js' : 'setting.js';

        const logBox = document.getElementById('logBox');
        logBox.value = '>> 初始化扫描任务...\n';
        
        // 【核心优化】限制前端日志累积大小，防止数万行文本撑爆 DOM
        const appendLog = (msg) => {
            logBox.value += msg + '\n';
            const lines = logBox.value.split('\n');
            if (lines.length > 500) {
                // 仅保留最新的 500 行日志
                logBox.value = lines.slice(-500).join('\n');
            }
            logBox.scrollTop = logBox.scrollHeight;
        };

        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        btn.textContent = '正在扫描并保存...';

        const formData = new FormData();
        formData.append('action', 'scan');
        formData.append('folders', JSON.stringify(folders));
        formData.append('configName', configNameInput);

        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData
            });

            if (!response.body) throw new Error('当前浏览器不支持流式读取（ReadableStream）。');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n');
                buffer = lines.pop(); // 缓存不完整的最后一行

                for (let line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'log') {
                            appendLog('扫描进度: ' + data.message);
                        } else if (data.type === 'error') {
                            appendLog('❌ 错误: ' + data.message);
                        } else if (data.type === 'done') {
                            appendLog('\n>> ' + data.message);
                            if(data.message.includes('✅')) {
                                alert(`${finalFileName} 配置文件已成功直接保存在服务器目录中！`);
                            }
                        }
                    } catch (e) {
                        // 忽略解析错误（主要用于兼容后端发出的前置 Buffer 占位空格）
                    }
                }
            }
        } catch (error) {
            appendLog('❌ 请求异常: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '生成配置';
        }
    }
</script>

</body>
</html>