/*!
 * fis3-preprocessor-vueTmpl
 * copyright 2016 Hiufan Zheng
 * email: Hiufan@qq.com
 * Released under the MIT License.
 */

'use strict';

var deasync = require('deasync');
var browserify = require('browserify');
var debowerify = require('debowerify');

var babelify = require('babelify'); // es2015 babel 转码
var embed = require('./embed');  // 兼容fis3的__uri()功能
var compiler = require('./compiler'); // 替换fis3的__inline()功能，直接进行模板预编译

module.exports = function (file, settings) {
    var realpath = file.realpath; // 文件的真实路径
    var dirname = file.dirname; // 文件的目录名
    var browerifyOpts = settings.browserify || {};
    var content = '';
    var isDone = false;
    var relativeTo = settings.relativeTo || ''
    var bundler = browserify(realpath, browerifyOpts);
    
    bundler.transform(embed(realpath));
    bundler.transform(compiler(file,relativeTo));

    if(settings.es2015 && settings.es2015.enable) {
        var es2015 = JSON.parse(JSON.stringify(settings.es2015));
        delete es2015.enable;
        bundler.transform(babelify.configure(es2015));
    }
    
    bundler.transform(debowerify); //注意上面的操作都处理完后再支持bower，否则会出错

    // 寻找依赖文件
    bundler.on('file', function (depFilePath) {
        if (depFilePath !== file.realpath) {
            file.cache.addDeps(depFilePath);
        }
    });

    bundler.bundle(function (err, buf) {
        if (err) {
            content = 'console.error(' + JSON.stringify(err.message) + ');' +
                        'console.error(' + JSON.stringify(err.annotated) + ');';
        } else {
            content = buf.toString();
        }
        isDone = true;
    });

    // 使用 deasync 让 browserify 同步输出到 content
    deasync.loopWhile(function (){
        return !isDone;
    });

    return content;
}