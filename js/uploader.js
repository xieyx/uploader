/**
    $(document).ready(function() {

        // attach the plugin to an element
        $('#element').pluginName({'foo': 'bar'});

        // call a public method
        $('#element').data('pluginName').foo_public_method();

        // get the value of a property
        $('#element').data('pluginName').settings.foo;

    });
 */
(function($) {

    $.uploader = function(element, options) {

        var defaults = {
            quality: 90,
            chunk: false,
            chunkSize: 1024*1024,
            accept: '*',
            tread: 3,
            rotate: 0,
            multiple: false,
            type: 'image/jpeg',
            thumb: {width: 200, height: 200}
        }

        var plugin = this;

        plugin.settings = {};
        plugin.prefix = 'UP_FILE_';
        plugin.file_id = 0;
        plugin.persentages = {};
        plugin.fileQueue = [];
        plugin.BLANK = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D';

        var $element = $(element),
             element = element;

        plugin.init = function() {
            plugin.settings = $.extend({}, defaults, options);
            // 生成上传控件
            $element.addClass('uploader-container');
            var $uploaderBody = $('<div/>');
            var $uploaderInput = $('<input/>');
            $uploaderBody.addClass('uploader-body').css({'width':$element.width(), 'height':$element.height()}).appendTo($element);
            $uploaderInput.attr({
                'type': 'file', 
                'name': 'file',
                'multiple': plugin.settings.multiple,
                'accept': plugin.settings.accept
            }).appendTo($uploaderBody);
            $('<label/>').bind('click',function(){
                $uploaderInput.click();
            }).appendTo($uploaderBody);
            $uploaderInput.change(function(e){
                plugin.addFile(e.target.files);
                /*初始化input*/
                $uploaderInput.replaceWith( $uploaderInput = $uploaderInput.clone( true ) );
            });
            var $uploadButton = plugin.settings.uploadButton;
            $uploadButton.click(function(){
                plugin.startUpload(plugin.fileQueue[0].file);
            });
        };
        plugin.addFile = function(files){
            var i;
            var $container = plugin.settings.container;
            var $template;
            for(i=0; i<files.length; i++) {
                files[i] = plugin.fileMSG(files[i]);
                $template = $(plugin.settings.template);
                plugin.fileQueue.push({'file': files[i]});
                $template.attr('file-id', files[i].id).find('img').attr('src',plugin.BLANK).end().find('.filename').html(files[i].name).end().find('.filesize').html(fileSizeFormate(files[i].size, 2));
                $container.append($template);
                plugin.thumb(files[i], function(isError, src, $template) {
                    $template.find('.file-msg').html('').end().find('.file-shadow').hide();
                    if(isError) {
                        // not image, show file type icon
                        $template.find('.file').addClass('no-preview').end().find('img').attr('src', fileIcon(src));
                    }else{
                        $template.find('img').attr('src', src);
                    }
                }, $template);
            }
        };
        plugin.fileMSG = function(file) {
            file.name = file.name || 'No Name';
            file.id = plugin.prefix + plugin.file_id++;
            file.ext = /\.([^.]+)$/.exec(file.name) ? RegExp.$1 : '';
            plugin.persentages[file.id] = {'total':file.size, 'loaded':0}
            return file;
        };

        plugin.thumb = function(file, callback, $template){
            //只预览图片类型
            if(!file.type.match(/^image\//)) {
                callback(true, file.ext, $template);
                return false;
            }
            var img = new Image();
            img.onload = function() {
                var imgRotation = 0;
                var imgRegX = 0;
                var imgRegY = 0;
                var vertSquashRatio = detectVerticalSquash(img);
                var imgWidth = img.width;
                var imgHeight = img.height;
                var imgScale = 1;
                imgWidth *= vertSquashRatio;
                imgHeight *= vertSquashRatio;
                var canvas = Q.createDOM("canvas", {width:50,height:100});
                // 根据长宽比进行缩放
                if(plugin.settings.thumb.width/imgWidth > plugin.settings.thumb.height/imgHeight) {
                    imgScale = plugin.settings.thumb.width/imgWidth;
                }else{
                    imgScale = plugin.settings.thumb.height/imgHeight;
                }
                imgWidth *= imgScale;
                imgHeight *= imgScale;
                
                var canvas = Q.createDOM('canvas', {width: plugin.settings.thumb.width, height: plugin.settings.thumb.height});
                var context = new Q.CanvasContext({canvas:canvas});
                var stage = new Q.Stage({context:context, width: plugin.settings.thumbwidth, height: plugin.settings.thumb.height, update: function(){
                    frames++;
                }});                                                 
                timer = new Q.Timer(1000/30);
                timer.addListener(stage);
                timer.start();
               /* var em = new Q.EventManager();
                var events = Q.supportTouch ? ["touchend"] : ["mouseup"];*/
                imgRegX = (imgWidth-plugin.settings.thumb.width)/imgScale/2;
                imgRegY = (imgHeight-plugin.settings.thumb.height)/imgScale/2;
                var bmp = new Q.Bitmap({image:img, regX: imgRegX, regY: imgRegY});
                bmp.rotation = imgRotation;
                bmp.x = 0;
                bmp.y = 0;
                bmp.scaleX = imgScale * vertSquashRatio;
                bmp.scaleY = imgScale;
                stage.addChild(bmp);
                window.setTimeout(function(){
                    callback(false, getAsDataUrl(canvas, plugin.settings.type), $template);
                    destory(canvas, img);
                }, 1000/30);
            }
                
                var dataURL = loadFromBlob(file);
                img.src = dataURL;
        };
        
        plugin.startUpload = function(file) {
            console.log(file)
            var formData = new FormData();
            formData.append('file', file);
            $.ajax({
                url: plugin.settings.server,
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'JSON',
                type: 'POST',
                xhr: function() {
                    var xhr = $.ajaxSettings.xhr();
                    if(xhr.upload) {
                        xhr.upload.addEventListener("progress", plugin.onFileProgress, false);
                    }
                    return xhr;
                },
                beforeSend: plugin.onFileBeforeUpload,
                complete: plugin.onFileUploadComplete,
                error: plugin.onFileUploadError
            })
        };
        
        plugin.onFileProgress = function(e) {
            var $container = plugin.settings.container;
            var $template = $container.find('[file-id='+plugin.fileQueue[0].file.id+']');
            if(e.lengthComputable) {
                var loaded = Math.floor(e.loaded/e.total*100)+'%';
                $template.find('.progress').show().end().find('.loaded').css({'width':loaded}).end().find('.file-shadow').show().end().find('.file-msg').html(loaded);
            }
        };
        plugin.onFileBeforeUpload = function(){};
        plugin.onFileUploadComplete = function(){
            plugin.fileQueue.splice(0,1);
            if(plugin.fileQueue.length > 0)
                plugin.startUpload(plugin.fileQueue[0].file);
        };
        plugin.onFileUploadError = function(ret){
            error(ret.status+': '+ret.statusText);
        };

        var loadFromBlob = function() {
            var urlAPI = window.createObjectURL && window ||
                window.URL && URL.revokeObjectURL && URL ||
                window.webkitURL,
            createObjectURL = function(){};
            if(urlAPI) {
                return urlAPI.createObjectURL.apply(urlAPI, arguments);
            }
            return null;
        },
        fileSizeFormate = function(size, dec) {
            size = size||0;
            dec = dec||2;
            var unit = ["B", "KB", "MB", "GB", "TB", "PB"];
            var pos = 0;
            while (size >= 1024) {
                size /= 1024;
                pos++;
            }
            return size.toFixed(dec)+unit[pos]
        },
        fileIcon = function(type) {
            var typeLimit = [
                'aep','ai','as','avi','css','doc','eps',
                'epub','fla','flv','gif','html','indd','jpg',
                'js','midi','mkv','mov','mp3','mp4','mpg',
                'ogg','otf','pdf','php','png','psd','rar',
                'rtf','svg','swc','swf','tif','ttf','txt',
                'wav','wma','wmv','xls','xml','zip'
            ];
            if(typeLimit.indexOf(type) > -1)
                return 'images/filetype/icon_'+type+'_256.png';
            return 'images/filetype/icon_blanc_256.png';
        },
        getAsDataUrl = function(canvas, type) {
            if(type == 'image/jpeg') {
                return canvas.toDataURL(type, plugin.settings.quality/100);
            }else{
                return canvas.toDataURL(type);
            }
        },
        destory = function(canvas, img) {
                img.onload = null;

                if(canvas) {
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = canvas.height = 0;
                    canvas = null;
                }
                img.src = plugin.BLANK;
                img = null;
        },
        error = function(msg) {
            plugin.settings.error.call($element, msg);
        },
        /**
         * Detecting vertical squash in loaded image.
         * Fixes a bug which squash image vertically while drawing into canvas for some images.
         */
        detectVerticalSquash = function(img) {
            var ih = img.height;
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = ih;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, 1, ih).data;
            // search image edge pixel position in case it is squashed vertically.
            var sy = 0;
            var ey = ih;
            var py = ih;
            while (py > sy) {
                var alpha = data[(py - 1) * 4 + 3];
                if (alpha === 0) {
                    ey = py;
                } else {
                    sy = py;
                }
                py = (ey + sy) >> 1;
            }
            var ratio = (py / ih);
            return (ratio===0) ? 1 : ratio;
        };
        plugin.init();

    }

    $.fn.uploader = function(options) {

        return this.each(function() {
            if (undefined == $(this).data('uploader')) {
                var plugin = new $.uploader(this, options);
                $(this).data('uploader', plugin);
            }
        });

    }

})(jQuery);
