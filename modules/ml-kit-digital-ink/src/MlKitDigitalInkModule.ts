import { requireOptionalNativeModule } from 'expo';

import type { MlKitDigitalInkModuleType } from './MlKitDigitalInk.types';

export default requireOptionalNativeModule<MlKitDigitalInkModuleType>('MlKitDigitalInk');
