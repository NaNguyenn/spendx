import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Amounts are decimal-safe end to end (see backend/CONTEXT.md and
 * docs/adr/0001): a positive decimal *string*, never a JSON number, so a
 * value like `0.1` never touches a JS float on the way in. Up to 16 integer
 * digits and 4 decimal places — matching the `Decimal(20, 4)` money columns
 * (see prisma/schema.prisma) exactly, so nothing validated here can fail to
 * persist on precision grounds.
 */
const MONEY_AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,4})?$/;
const ALL_ZERO_PATTERN = /^0+(\.0+)?$/;

/**
 * True for a positive, bounded-scale decimal string a `Decimal(20, 4)`
 * column can hold exactly. Deliberately string-only arithmetic-free
 * validation — even the "is this zero" check is a regex, not `Number(...)`,
 * so nothing here ever routes an amount through a JS float.
 */
export function isValidMoneyAmount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    MONEY_AMOUNT_PATTERN.test(value) &&
    !ALL_ZERO_PATTERN.test(value)
  );
}

@ValidatorConstraint({ name: 'isMoneyAmount', async: false })
class IsMoneyAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidMoneyAmount(value);
  }

  defaultMessage(): string {
    return '$property must be a positive decimal string with at most 4 decimal places';
  }
}

/** class-validator decorator wrapping `isValidMoneyAmount`. */
export function IsMoneyAmount(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsMoneyAmountConstraint,
    });
  };
}
