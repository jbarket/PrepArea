cordova build --release android
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore preparea.keystore platforms/android/ant-build/PrepArea-release-unsigned.apk preparea
zipalign -v 4 PrepArea-release-unsigned.apk PrepArea.apk