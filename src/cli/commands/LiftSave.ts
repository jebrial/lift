import { Command, arg, isError, format, HelpError, Env } from '@prisma/cli'
import prompt from 'prompts'
import chalk from 'chalk'
import { Lift } from '../../Lift'
import path from 'path'
import { serializeFileMap } from '../../utils/serializeFileMap'
import { printFiles } from '../../utils/printFiles'
import { printMigrationId } from '../../utils/printMigrationId'
import fs from 'fs'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)

/**
 * $ prisma migrate new
 */
export class LiftSave implements Command {
  static new(env: Env): LiftSave {
    return new LiftSave(env)
  }
  private constructor(private readonly env: Env) {}

  // parse arguments
  async parse(argv: string[]): Promise<string | Error> {
    // parse the arguments according to the spec
    const args = arg(argv, {
      '--help': Boolean,
      '-h': '--help',
      '--name': String,
      '-n': '--name',
      '--preview': Boolean,
      '-p': '--preview',
    })
    if (isError(args)) {
      return this.help(args.message)
    } else if (args['--help']) {
      return this.help()
    }
    const preview = args['--preview'] || false
    const lift = new Lift(this.env.cwd)

    const migration = await lift.createMigration('DUMMY_NAME')

    if (!migration) {
      return `Everything up-to-date\n` //TODO: find better wording
    }

    const name = preview ? args['--name'] : await this.name(args['--name'])

    const { files, newLockFile, migrationId } = await lift.save(migration, name, preview)

    if (preview) {
      return `\nRun ${chalk.greenBright('prisma lift save --name MIGRATION_NAME')} to create the migration\n`
    }

    const migrationsDir = path.join(this.env.cwd, 'migrations', migrationId)
    await serializeFileMap(files, migrationsDir)
    const lockFilePath = path.join(this.env.cwd, 'migrations', 'lift.lock')
    await writeFile(lockFilePath, newLockFile)

    return `\nLift just created your migration ${printMigrationId(migrationId)} in\n\n${chalk.dim(
      printFiles(`migrations/${migrationId}`, files),
    )}\n\nRun ${chalk.greenBright('prisma2 lift up')} to apply the migration\n`
  }

  // get the name
  async name(name?: string): Promise<string | undefined> {
    if (name === '') return undefined
    if (name) return name
    let response = await prompt({
      type: 'text',
      name: 'name',
      message: `Name of migration`,
    })
    return response.name || undefined
  }

  // help message
  help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${chalk.bold.red(`!`)} ${error}\n${LiftSave.help}`)
    }
    return LiftSave.help
  }

  // static help template
  private static help = format(`
    Save a migration

    ${chalk.bold('Usage')}

      prisma migrate save [options]

    ${chalk.bold('Options')}

      -h, --help     Displays this help message
      -n, --name     Name the migration

    ${chalk.bold('Examples')}

      Create a new migration
      ${chalk.dim(`$`)} prisma migrate save

      Create a new migration by name
      ${chalk.dim(`$`)} prisma migrate save --name "add unique to email"

  `)
}
