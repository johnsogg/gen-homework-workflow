import { type JestConfigWithTsJest, createDefaultPreset } from 'ts-jest'

const defaultPreset = createDefaultPreset()

const jestConfig: JestConfigWithTsJest = {
    ...defaultPreset,
}

export default jestConfig;