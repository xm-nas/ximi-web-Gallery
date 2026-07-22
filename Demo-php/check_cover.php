<?php
// check_cover.php
header('Content-Type: application/json; charset=utf-8');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Invalid Request']);
    exit;
}

$defaultCover = './assets/img/Cover.png'; 
$resultCovers = [];
$resultLyrics = [];

// 1. 检查目录封面 (Cover.jpg)
if (isset($data['dirs']) && is_array($data['dirs'])) {
    foreach ($data['dirs'] as $dir) {
        $localDir = urldecode($dir);
        $localDir = ltrim($localDir, '/');
        if (strpos($localDir, './') === 0) $localDir = substr($localDir, 2);

        $localCoverPath = $localDir === '' ? 'Cover.jpg' : $localDir . '/Cover.jpg';
        if (file_exists($localCoverPath)) {
            $resultCovers[$dir] = $dir === '.' ? './Cover.jpg' : $dir . '/Cover.jpg';
        } else {
            $resultCovers[$dir] = $defaultCover;
        }
    }
}

// 2. 检查同名歌词文件 (.lrc)
if (isset($data['songs']) && is_array($data['songs'])) {
    foreach ($data['songs'] as $song) {
        $localSong = urldecode($song);
        $localSong = ltrim($localSong, '/');
        if (strpos($localSong, './') === 0) $localSong = substr($localSong, 2);

        // 把音频后缀（如 .mp3, .flac）替换为 .lrc
        $pathInfo = pathinfo($localSong);
        if (isset($pathInfo['dirname']) && isset($pathInfo['filename'])) {
            $dirPath = $pathInfo['dirname'] === '.' ? '' : $pathInfo['dirname'] . '/';
            $localLrcPath = $dirPath . $pathInfo['filename'] . '.lrc';
            
            // 如果物理文件存在，则把对应的 Web 路径返回给前端
            if (file_exists($localLrcPath)) {
                $webDir = dirname($song) === '.' ? '' : dirname($song) . '/';
                $resultLyrics[$song] = $webDir . pathinfo($song, PATHINFO_FILENAME) . '.lrc';
            }
        }
    }
}

echo json_encode(['success' => true, 'covers' => $resultCovers, 'lyrics' => $resultLyrics]);
?>