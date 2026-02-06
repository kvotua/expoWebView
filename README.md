### Подготовка к билду


1. Библиотека expo-vad-detector должна находится в одной папке с текущим проектом

```
Folder

├── expo-audio

└── expo-vad-detector
```

2. Установка зависимостей

```yarn add```

3. Подготовка проекта к билду

```npx expo prebuild```

4. Билд приложения

```

cd ./android

./gradlew assembleRelease

```