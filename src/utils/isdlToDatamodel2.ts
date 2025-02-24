import { LiftEngine } from '../LiftEngine'
import { ISDL } from 'prisma-datamodel'
import { DataSource, GeneratorConfig } from '../types'
import { isdlToDmmfDatamodel } from './isdlToDmmf'

export async function isdlToDatamodel2(isdl: ISDL, datasources: DataSource[], generators: GeneratorConfig[] = []) {
  const engine = new LiftEngine({ projectDir: process.cwd() })
  const { dmmf } = await isdlToDmmfDatamodel(isdl)

  const result = await engine.convertDmmfToDml({
    dmmf: JSON.stringify(dmmf),
    config: { datasources, generators },
  })

  return result.datamodel
}
