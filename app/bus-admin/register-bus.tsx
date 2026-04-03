import { Redirect, type Href } from 'expo-router';

export default function LegacyRegisterBusRoute() {
  return <Redirect href={'/bus-admin/index' as Href} />;
}
