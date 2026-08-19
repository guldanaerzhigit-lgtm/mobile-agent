# Agent Messenger

Современный веб/PWA-мессенджер в духе классического Mail.ru Агента. Фирменные логотипы и защищённые материалы оригинального сервиса не используются.

## Уже реализовано

- Email/password регистрация и вход через Firebase Authentication
- профили пользователей и статусы
- поиск пользователей
- личные чаты с real-time обновлением Firestore
- единая детерминированная схема `conversationId`, чтобы отправитель и получатель видели одну переписку
- отправка текста, фото и файлов через Firebase Storage
- индикаторы отправки/прочтения в модели сообщения
- emoji
- адаптивный интерфейс для ПК и телефона
- PWA и service worker
- светлая/тёмная тема
- базовый WebRTC-каркас аудио/видеозвонков
- Firestore и Storage Security Rules

## Firebase setup

1. Открой Firebase Console и выбери проект `chatss-daa4b`.
2. В Project settings → Your apps создай Web App или открой существующий.
3. Скопируй `storageBucket`, `messagingSenderId` и `appId` в `firebase-config.js`.
4. В Authentication включи Email/Password.
5. Создай Firestore Database.
6. Опубликуй `firestore.rules` как Firestore Rules.
7. Опубликуй `storage.rules` как Storage Rules.
8. Для публикации можно использовать Firebase Hosting или GitHub Pages.

## Firestore structure

```text
users/{uid}
conversations/{conversationId}
  messages/{messageId}
calls/{callId}
  signals/{signalId}
```

`conversationId` строится из двух UID в отсортированном порядке. Это предотвращает ситуацию, когда один пользователь пишет в одну коллекцию, а второй слушает другую.

## Важно для звонков

Для реальных звонков между мобильными сетями нужен TURN-сервер. STUN используется в демонстрационной конфигурации; без TURN некоторые NAT/мобильные сети не смогут установить прямое соединение.

## Запуск

Для ES modules нужен HTTPS или localhost. Например, Firebase Hosting, GitHub Pages или любой статический сервер.
