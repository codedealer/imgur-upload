import inquirer from 'inquirer';

export async function pause (message: string = 'Press enter to continue...'): Promise<void> {
  await inquirer.prompt({
    type: 'input',
    name: 'continue',
    message: message,
  });
}
