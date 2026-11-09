package com.chenxing.workbench;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import java.util.Locale;
import androidx.appcompat.app.AppCompatActivity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private TextToSpeech tts;
    private static final String URL = "https://chenxing-workbench.onrender.com";
    private static final int REQ_RECORD_AUDIO = 1001;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 全屏
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        webView = new WebView(this);
        setContentView(webView);

        // 初始化语音合成
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    tts.setLanguage(Locale.CHINESE);
                }
            }
        });

        // 添加 JS 接口，让网页可以调用原生语音朗读
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void speak(String text, String lang) {
                speakWithRate(text, lang, 1.0f);
            }

            // 慢速朗读：给小朋友听，0.7 倍速
            @JavascriptInterface
            public void speakSlow(String text, String lang) {
                speakWithRate(text, lang, 0.7f);
            }

            private void speakWithRate(String text, String lang, float rate) {
                if (tts != null && text != null && !text.isEmpty()) {
                    if ("en".equals(lang)) {
                        tts.setLanguage(Locale.ENGLISH);
                    } else {
                        tts.setLanguage(Locale.CHINESE);
                    }
                    // setSpeechRate 是持久设置，每次都要显式设定，避免慢速串到其它模块
                    tts.setSpeechRate(rate);
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cx_tts");
                }
            }

            @JavascriptInterface
            public void stopSpeak() {
                if (tts != null) {
                    tts.stop();
                }
            }
        }, "AndroidTTS");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false); // 允许音频自动播放
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 页面加载完成后，尝试恢复音频上下文
                view.evaluateJavascript(
                    "(function() { " +
                    "  if (window.AudioContext || window.webkitAudioContext) { " +
                    "    var ctx = new (window.AudioContext || window.webkitAudioContext)(); " +
                    "    if (ctx.state === 'suspended') ctx.resume(); " +
                    "  } " +
                    "  document.addEventListener('click', function() { " +
                    "    if (window.AudioContext || window.webkitAudioContext) { " +
                    "      var ctx = new (window.AudioContext || window.webkitAudioContext)(); " +
                    "      if (ctx.state === 'suspended') ctx.resume(); " +
                    "    } " +
                    "  }, { once: true }); " +
                    "})();",
                    null
                );
            }
        });

        // 网页里的麦克风（孩子跟读、语音评测）→ WebView 默认拒绝，必须显式授权
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            request.deny();
                        }
                    }
                });
            }
        });

        askAudioPermission();

        webView.loadUrl(URL);
    }


    // 安卓 6.0+ 麦克风要运行时申请
    private void askAudioPermission() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_RECORD_AUDIO);
                }
            }
        } catch (Exception e) {
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
    }
}
