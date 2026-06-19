import {
  buildSkillInjection,
  matchNodes,
  resolveSkillContent,
} from "./skills/_directory";

export function matchSkills(text: string): string {
  return buildSkillInjection(text);
}
