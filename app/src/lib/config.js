// Налаштування: канал ThingSpeak і датчики. Змінюйте тут, коли додаєте/переставляєте датчики.
// pos — координати маркера в кімнаті [x, висота, z] (див. room.js), cam — ракурс камери при виборі датчика,
// fT / fH — поля каналу ThingSpeak з температурою і вологістю.
// role: 'heater' — за цим датчиком визначається, чи працює опалення (js/events.js).
export const CHANNEL_ID = '3579358';
export const READ_KEY   = '';          // можна вписати сюди; інакше сторінка попросить ключ і запам'ятає
export const REFRESH_MS = 60000;       // як часто оновлювати дані
export const BG_ANIMATE = false;       // повільний рух сітки на фоні (на слабких телефонах може гальмувати разом із розмиттям)

export const SENSORS = [
  { id: 'd1', code: 'Д1', name: 'Диван', pos: [12, 62, 510], cam: { ry: -50, rx: -16, zoom: 70 }, fT: 'field1', fH: 'field2' },
  { id: 'd2', code: 'Д2', name: 'Батарея', role: 'heater', pos: [104, 76, 7], cam: { ry: 14, rx: -20, zoom: 90 }, fT: 'field3', fH: 'field4' },
  { id: 'd3', code: 'Д3', name: 'Вікно', pos: [284, 79, -7], cam: { ry: -10, rx: -20, zoom: 90 }, fT: 'field5', fH: 'field6' },
  { id: 'd4', code: 'Д4', name: 'Пацючки', pos: [331, 53, 438], cam: { ry: 48, rx: -18, zoom: 70 }, fT: 'field7', fH: 'field8' }
];
