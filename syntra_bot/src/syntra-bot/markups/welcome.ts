export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hello @${userName} 👋\n\nWelcome to <b>Syntra</b> bot`,
  };
};
