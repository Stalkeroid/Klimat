import { dayLabel } from './utils.js';

// «Як давно» для підписів зв'язку датчиків. (Світло/опалення — у power.js.)

// «як давно»: щойно / 5 хв / 3 год / 14 ЛИС
export function agoText(ts) {
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'щойно';
  if (m < 60) return m + ' хв';
  if (m < 24 * 60) return Math.round(m / 60) + ' год';
  return dayLabel(ts);
}
