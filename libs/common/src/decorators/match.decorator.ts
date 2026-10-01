import {
   registerDecorator,
   ValidationArguments,
   ValidationOptions,
   ValidatorConstraint,
   ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMatch', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
   validate(propertyValue: unknown, args: ValidationArguments): boolean {
      const relatedPropertyName = String(args.constraints[0]);
      const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
      return propertyValue === relatedValue;
   }

   defaultMessage(args: ValidationArguments): string {
      const relatedPropertyName = String(args.constraints[0]);
      return `${args.property} must match ${relatedPropertyName}`;
   }
}

export function Match(property: string, validationOptions?: ValidationOptions) {
   return (object: object, propertyName: string): void => {
      registerDecorator({
         target: object.constructor,
         propertyName,
         options: validationOptions,
         constraints: [property],
         validator: MatchConstraint,
      });
   };
}
