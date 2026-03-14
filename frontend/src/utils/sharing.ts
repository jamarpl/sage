import { Linking, Share, Platform } from 'react-native';
import { getAlertApi } from '../context/AlertContext';
import { API_ORIGIN } from '../constants/api';

export interface EventShareData {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  locationName?: string;
  shareToken?: string;
}

export const generateShareUrl = (shareToken: string): string => {
  return `${API_ORIGIN}/events/${shareToken}`;
};

export const generateShareMessage = (event: EventShareData, shareUrl: string): string => {
  const date = new Date(event.startTime);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let message = `📅 ${event.title}\n\n`;
  
  if (event.description) {
    message += `${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n\n`;
  }
  
  message += `🗓 ${formattedDate}\n`;
  message += `⏰ ${formattedTime}\n`;
  
  if (event.locationName) {
    message += `📍 ${event.locationName}\n`;
  }
  
  message += `\n🔗 ${shareUrl}`;
  
  return message;
};

export const shareViaWhatsApp = async (event: EventShareData, shareUrl: string): Promise<boolean> => {
  try {
    const message = generateShareMessage(event, shareUrl);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      getAlertApi()?.showAlert('WhatsApp Not Installed', 'WhatsApp is not installed on your device.');
      return false;
    }
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    getAlertApi()?.showToast('Failed to share via WhatsApp', 'error');
    return false;
  }
};

export const shareViaInstagram = async (event: EventShareData, shareUrl: string): Promise<boolean> => {
  try {
    // Instagram doesn't support direct text sharing via URL scheme
    // We'll copy the message and open Instagram, then user can paste
    const message = generateShareMessage(event, shareUrl);
    // Use system share sheet to copy, then open Instagram
    await Share.share({ message, title: event.title });

    const instagramUrl = 'instagram://';
    const canOpen = await Linking.canOpenURL(instagramUrl);
    
    if (canOpen) {
      getAlertApi()?.showAlert(
        'Share to Instagram',
        'Event details copied! Instagram will open now. You can paste the details in your story or post.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Instagram', 
            onPress: async () => {
              await Linking.openURL(instagramUrl);
            }
          }
        ]
      );
      return true;
    } else {
      getAlertApi()?.showAlert('Instagram Not Installed', 'Instagram is not installed on your device.');
      return false;
    }
  } catch (error) {
    console.error('Error sharing via Instagram:', error);
    getAlertApi()?.showToast('Failed to share via Instagram', 'error');
    return false;
  }
};

export const shareViaMessages = async (event: EventShareData, shareUrl: string): Promise<boolean> => {
  try {
    const message = generateShareMessage(event, shareUrl);
    const encodedMessage = encodeURIComponent(message);
    
    // iOS uses sms:, Android uses sms:
    const smsUrl = Platform.OS === 'ios' 
      ? `sms:&body=${encodedMessage}`
      : `sms:?body=${encodedMessage}`;
    
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (canOpen) {
      await Linking.openURL(smsUrl);
      return true;
    } else {
      throw new Error('Cannot open Messages');
    }
  } catch (error) {
    console.error('Error sharing via Messages:', error);
    getAlertApi()?.showToast('Failed to share via Messages', 'error');
    return false;
  }
};

export const shareViaEmail = async (event: EventShareData, shareUrl: string): Promise<boolean> => {
  try {
    const message = generateShareMessage(event, shareUrl);
    const subject = encodeURIComponent(`Event: ${event.title}`);
    const body = encodeURIComponent(message);
    
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    
    const canOpen = await Linking.canOpenURL(emailUrl);
    if (canOpen) {
      await Linking.openURL(emailUrl);
      return true;
    } else {
      throw new Error('Cannot open Email');
    }
  } catch (error) {
    console.error('Error sharing via Email:', error);
    getAlertApi()?.showToast('Failed to share via Email', 'error');
    return false;
  }
};

export const shareViaSystemDialog = async (event: EventShareData, shareUrl: string): Promise<boolean> => {
  try {
    const message = generateShareMessage(event, shareUrl);
    
    const result = await Share.share({
      message,
      title: event.title,
      url: shareUrl, // iOS only
    });
    
    if (result.action === Share.sharedAction) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sharing:', error);
    getAlertApi()?.showToast('Failed to share event', 'error');
    return false;
  }
};

export const copyToClipboard = async (shareUrl: string): Promise<boolean> => {
  try {
    await Share.share({ message: shareUrl });
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    getAlertApi()?.showToast('Failed to copy link', 'error');
    return false;
  }
};
