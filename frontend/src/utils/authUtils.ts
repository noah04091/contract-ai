// 📁 src/utils/authUtils.ts - Separate utilities file for auth types and helpers

// ✅ User data interface - ERWEITERT um fehlende Properties
export interface UserData {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionActive?: boolean; // ✅ HINZUGEFÜGT - War im bestehenden Code verwendet
  analysisCount?: number;
  createdAt?: string;
  updatedAt?: string;
  // Add other user properties as needed
}

// ✅ Helper functions for auth (non-component exports)
export const getDisplayName = (user: UserData): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  return user.email;
};

export const getSubscriptionDisplayName = (plan?: string): string => {
  switch (plan) {
    case 'premium':
      return 'Premium';
    case 'business':
      return 'Business';
    case 'free':
    default:
      return 'Kostenlos';
  }
};

export const isSubscribed = (user: UserData): boolean => {
  return user.subscriptionPlan === 'premium' || user.subscriptionPlan === 'business';
};

// ✅ NEU: Helper für subscriptionActive Check
export const isSubscriptionActive = (user: UserData): boolean => {
  return user.subscriptionActive === true;
};