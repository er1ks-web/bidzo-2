package com.bidzo.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web app say "I've rendered, you can go" (hideSplash() in src/lib/native.js).
 * MainActivity keeps the launch screen up until then and plays the exit animation.
 */
@CapacitorPlugin(name = "LaunchScreen")
public class LaunchScreenPlugin extends Plugin {

    static volatile boolean appReady = false;

    @PluginMethod
    public void hide(PluginCall call) {
        appReady = true;
        call.resolve();
    }
}
