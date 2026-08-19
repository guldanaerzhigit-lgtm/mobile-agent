# Agent Messenger

Рабочий веб/PWA-мессенджер в стиле классического Mail.ru Агента, без копирования фирменных защищённых материалов оригинального сервиса.

## Стек
- Firebase Authentication
- Cloud Firestore realtime listeners
- Firebase Storage
- WebRTC-каркас звонков
- PWA / Service Worker

## Firebase
Проект: `agent-21dde`.

В `firebase-config.js` уже указана конфигурация Firebase Web App.

В Firebase Console необходимо включить:
1. Authentication → Sign-in method → Email/Password.
2. Firestore Database.
3. Storage.
4. Опубликовать `firestore.rules` и `storage.rules`.

## Основная схема данных
```text
users/{uid}
conversations/{conversationId}
  messages/{messageId}
calls/{callId}
  signals/{signalId}
```

Для личного чата `conversationId` строится из двух UID в отсортированном порядке. Поэтому оба пользователя всегда работают с одной и той же перепиской.

## Важно
Firestore Security Rules применяются к запросам целиком, поэтому запросы приложения должны соответствовать ограничениям правил. Это особенно важно для списков и realtime listeners. См. официальную документацию Firebase.

Для production-звонков между мобильными сетями потребуется TURN-сервер; одного STUN недостаточно для всех типов NAT.
