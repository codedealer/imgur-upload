import inquirer from 'inquirer';

export async function pause (message: string = 'Press enter to continue...'): Promise<void> {
  await inquirer.prompt({
    type: 'input',
    name: 'continue',
    message: message,
  });
}

export const trimFileName = (filename: string, maxLength = 15): string => {
  if (filename.length <= maxLength) {
    return filename;
  }

  const prefixLength = Math.ceil((maxLength - 3) / 2);
  const suffixLength = maxLength - prefixLength - 3;

  return `${filename.slice(0, prefixLength)}...${filename.slice(-suffixLength)}`;
}
