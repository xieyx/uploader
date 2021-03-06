<?php
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    $name = $_POST['name'];
    $index = $_POST['index'];
    $total = $_POST['total'];
    $ext = $_POST['ext'];
    $dir = 'upload/'.date('Ym').'/'.date('d').'/'.md5($name);
    if(!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    $uploadStatus = uploadFile($_FILES['file'], $dir, $index);
    $uploadStatus['type'] = 'chunk';
    if(allChunkUploadComplete($dir, $total)) {
        $uploadStatus['info'] = combineChunk($dir, $ext, $total);
        $uploadStatus['type'] = 'complete';
    }
    echo json_encode($uploadStatus);
    function allChunkUploadComplete($dir, $chunkNum) {
        // scandir() 包括"."和".."，故加2
        if(count(scandir($dir)) == $chunkNum+2)
            return 1;
        return 0;
    }
    function combineChunk($dir, $ext, $chunkNum) {
        $ext = $ext == '' ? '' : '.'.$ext;
        $fileName = dirname($dir).'/'.time().mt_rand(1000, 9999);
        $fp = fopen($fileName.$ext, "ab");
        for($i=0; $i<$chunkNum; $i++) {
            $chunkFile = $dir.'/'.$i;
            $handle = fopen($chunkFile, 'r');
            fwrite($fp, fread($handle, filesize($chunkFile)));
            fclose($handle);
            unlink($chunkFile);
        }
        fclose($fp);
        rmdir($dir);
        return $fileName.$ext;
    }
    function uploadFile($upFile, $path, $newFileName) {
        $path = rtrim($path, "/")."/";
        $res = array(
            'status' => false,
            'info'   => ''
        );

        if($upFile['error'] > 0) {
            switch($upFile['error']) {
                case 1: $info="上传文件大小超出PHP配置文件的设置"; break; 
                case 2: $info="上传文件大小超过了表单中MAX_FILE_SIZE指定的值"; break; 
                case 3: $info="文件只有部分被上传。"; break; 
                case 4: $info="没有文件被上传。"; break; 
                case 6: $info="找不到临时文件夹。"; break; 
                case 7: $info="文件写入失败。"; break; 
                default: $info="未知错误"; break;
            }
            $res['info'] = $info;
            return $res;
        }
        
        $ext = pathinfo($upFile['name'],PATHINFO_EXTENSION);
        if($newFileName === '') {
            do {
                $newFileName = time().rand(1000,9999);
                $newFileName = $ext ? $newFileName.'.'.$ext : $newFileName;
            }while(file_exists($path.$newFileName));
        }
        if(is_uploaded_file($upFile['tmp_name'])) {
            if(move_uploaded_file($upFile['tmp_name'], $path.$newFileName)) {
                $res['info']   = $newFileName;
                $res['status'] = true;
            }else{
                $res['info'] = '执行上传文件移到失败！';
            }
        }else{
            $res['info'] = '不是一个有效的上传文件！';
        }
        return $res;

    }
