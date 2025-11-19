# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

-keep class com.facebook.react.** { *; }
-keep class com.swmansion.gesturehandler.react.** { *; }
-keep class expo.modules.** { *; }  # if using Expo modules
-keepclassmembers class * {
  @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
-dontwarn okhttp3.**
-dontwarn com.facebook.react.**
