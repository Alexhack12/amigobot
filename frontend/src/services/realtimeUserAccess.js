export const BLOCKED_AUTH_NOTICE_KEY = "authNotice";
export const BLOCKED_AUTH_NOTICE_VALUE = "blocked";
export const BLOCKED_AUTH_MESSAGE =
  "Tu acceso ha sido bloqueado. Contacta a tu psicólogo o al administrador si consideras que se trata de un error.";

export const saveBlockedAuthNotice = (storage) => {
  storage?.setItem(BLOCKED_AUTH_NOTICE_KEY, BLOCKED_AUTH_NOTICE_VALUE);
};

export const getBlockedAuthNotice = (storage) => {
  if (storage?.getItem(BLOCKED_AUTH_NOTICE_KEY) !== BLOCKED_AUTH_NOTICE_VALUE) {
    return null;
  }

  return BLOCKED_AUTH_MESSAGE;
};

export const clearBlockedAuthNotice = (storage) => {
  if (storage?.getItem(BLOCKED_AUTH_NOTICE_KEY) === BLOCKED_AUTH_NOTICE_VALUE) {
    storage.removeItem(BLOCKED_AUTH_NOTICE_KEY);
  }
};

export const consumeBlockedAuthNotice = (storage) => {
  const notice = getBlockedAuthNotice(storage);

  if (notice) {
    clearBlockedAuthNotice(storage);
  }

  return notice;
};

export const createRealtimeUserAccessMonitor = ({
  observeAuth,
  subscribeUser,
  signOutUser,
  onAuthUser = () => {},
  onAccessChange = () => {},
  onBlocked = () => {},
  onError = () => {},
}) => {
  let stopped = false;
  let currentUid = null;
  let userUnsubscribe = null;
  let listenerGeneration = 0;
  let signOutStarted = false;

  const clearUserListener = () => {
    listenerGeneration += 1;

    if (userUnsubscribe) {
      userUnsubscribe();
      userUnsubscribe = null;
    }

    currentUid = null;
  };

  const authUnsubscribe = observeAuth((currentUser) => {
    if (stopped) return;

    onAuthUser(currentUser || null);

    const nextUid = currentUser?.uid || null;

    if (nextUid && nextUid === currentUid && userUnsubscribe) {
      return;
    }

    clearUserListener();
    signOutStarted = false;

    if (!nextUid) {
      onAccessChange("signed-out");
      return;
    }

    currentUid = nextUid;
    const activeGeneration = listenerGeneration;
    onAccessChange("checking");

    const unsubscribe = subscribeUser(
      nextUid,
      (snapshot) => {
        if (
          stopped ||
          activeGeneration !== listenerGeneration ||
          currentUid !== nextUid
        ) {
          return;
        }

        if (!snapshot.exists()) {
          onAccessChange("allowed");
          return;
        }

        if (snapshot.data()?.blocked !== true) {
          onAccessChange("allowed");
          return;
        }

        if (signOutStarted) return;

        signOutStarted = true;
        onAccessChange("blocked");
        onBlocked();

        Promise.resolve(signOutUser()).catch(onError);
      },
      (error) => {
        if (
          stopped ||
          activeGeneration !== listenerGeneration ||
          currentUid !== nextUid
        ) {
          return;
        }

        onError(error);
        onAccessChange("allowed");
      }
    );

    userUnsubscribe = typeof unsubscribe === "function" ? unsubscribe : null;
  });

  return () => {
    if (stopped) return;

    stopped = true;
    clearUserListener();

    if (typeof authUnsubscribe === "function") {
      authUnsubscribe();
    }
  };
};
