const checkCondition = (rule, formResponses) => {
  const { fieldKey, comparisonType, expectedValue } = rule;
  const userResponse = formResponses[fieldKey];

  if (userResponse === undefined || userResponse === null) {
    return false;
  }

  switch (comparisonType) {
    case 'is_equal':
      return Array.isArray(userResponse) 
        ? userResponse.includes(expectedValue)
        : userResponse === expectedValue;

    case 'not_equal':
      return Array.isArray(userResponse)
        ? !userResponse.includes(expectedValue)
        : userResponse !== expectedValue;

    case 'contains_text':
      const responseText = String(userResponse).toLowerCase();
      const searchText = String(expectedValue).toLowerCase();
      
      if (Array.isArray(userResponse)) {
        return userResponse.some(item => 
          String(item).toLowerCase().includes(searchText)
        );
      }
      
      return responseText.includes(searchText);

    default:
      console.warn(`Unknown comparison type: ${comparisonType}`);
      return false;
  }
};

const isFieldVisible = (visibilityRules, currentResponses) => {
  if (!visibilityRules?.conditions?.length) {
    return true;
  }

  const conditionResults = visibilityRules.conditions.map(condition => 
    checkCondition(condition, currentResponses)
  );

  const logicalOperator = visibilityRules.operator || 'AND';
  
  if (logicalOperator === 'OR') {
    return conditionResults.some(result => result === true);
  }
  
  return conditionResults.every(result => result === true);
};

const getVisibleFields = (formFields, responses) => {
  return formFields.filter(field => {
    if (!field.visibilityRules) return true;
    return isFieldVisible(field.visibilityRules, responses);
  });
};

module.exports = {
  isFieldVisible,
  checkCondition,
  getVisibleFields
};
