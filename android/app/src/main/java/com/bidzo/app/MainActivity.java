package com.bidzo.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Never leave the user on the launch screen if the web app fails to report in.
    private static final long MAX_SPLASH_MS = 6000;

    // Exit: the logo eases a little bigger while fading out, and the app fades in underneath.
    private static final long EXIT_MS = 320;
    private static final float EXIT_SCALE = 1.2f;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(LaunchScreenPlugin.class);
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        LaunchScreenPlugin.appReady = false;
        new Handler(Looper.getMainLooper()).postDelayed(() -> LaunchScreenPlugin.appReady = true, MAX_SPLASH_MS);

        splash.setKeepOnScreenCondition(() -> !LaunchScreenPlugin.appReady);
        splash.setOnExitAnimationListener(this::fadeOutLogo);
    }

    private void fadeOutLogo(SplashScreenViewProvider provider) {
        View splashView = provider.getView();
        View icon = provider.getIconView();

        // Let the spin-in (splash_icon_animated.xml) finish if the app loaded faster than it.
        // The start time is wall-clock (epoch) millis, not uptime.
        long introEnd = provider.getIconAnimationStartMillis() + provider.getIconAnimationDurationMillis();
        long delay = Math.min(1000, Math.max(0, introEnd - System.currentTimeMillis()));

        ObjectAnimator grow = ObjectAnimator.ofPropertyValuesHolder(icon,
            PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, EXIT_SCALE),
            PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, EXIT_SCALE),
            PropertyValuesHolder.ofFloat(View.ALPHA, 1f, 0f));
        ObjectAnimator fadeOut = ObjectAnimator.ofFloat(splashView, View.ALPHA, 1f, 0f);
        // Background trails the logo slightly so the logo is mostly gone before the app shows.
        fadeOut.setStartDelay(EXIT_MS / 3);

        AnimatorSet exit = new AnimatorSet();
        exit.playTogether(grow, fadeOut);
        exit.setDuration(EXIT_MS);
        exit.setInterpolator(new DecelerateInterpolator());
        exit.setStartDelay(delay);
        exit.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                provider.remove();
            }
        });
        exit.start();
    }
}
