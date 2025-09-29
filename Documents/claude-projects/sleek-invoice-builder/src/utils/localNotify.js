import { logError, logInfo } from '../utils/errorHandler';

export async function scheduleLocalNotification({ id, title, body, whenMs }) {
  // Check if we're in a Capacitor environment
  const nav = window.Capacitor && 
              window.Capacitor.Plugins && 
              window.Capacitor.Plugins.LocalNotifications;
  
  if (!nav) {
    // console.log('Local notifications not available (web environment)');
    return false;
  }
  
  try {
    await nav.schedule({
      notifications: [{
        id: id || Math.floor(Math.random() * 100000),
        title: title || 'Reminder',
        body: body || '',
        schedule: { at: new Date(whenMs) }
      }]
    });
    return true;
  } catch (err) {
    logError('LocalNotify.to', err);
    return false;
  }
}

export async function cancelNotification(id) {
  const nav = window.Capacitor && 
              window.Capacitor.Plugins && 
              window.Capacitor.Plugins.LocalNotifications;
  
  if (!nav) return false;
  
  try {
    await nav.cancel({ notifications: [{ id }] });
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission() {
  const nav = window.Capacitor && 
              window.Capacitor.Plugins && 
              window.Capacitor.Plugins.LocalNotifications;
  
  if (!nav) return false;
  
  try {
    const result = await nav.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}