/* VoidWalkr — Ko-fi widget bootstrap.
 *
 * Runs immediately after the Ko-fi widget script (Widget_2.js), which
 * defines the global kofiwidget2. Kept in its own file so the page can be
 * served under a strict Content-Security-Policy without 'unsafe-inline'.
 */
(function () {
  'use strict';
  if (!window.kofiwidget2 || !window.kofiwidget2.init) return;
  try {
    kofiwidget2.init('Buy me a Caffeinated Drink', '#001496', 'R5E3224KOP');
    kofiwidget2.draw();
  } catch (e) {
    /* The widget is a nicety — never let it take the page down. */
  }
})();
