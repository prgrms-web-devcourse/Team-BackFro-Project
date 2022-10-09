import styled from '@emotion/styled';
import { DatePicker } from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ValueOf } from 'types/utility';
import { SubmitData } from '../..';

const MESSAGE = {
  NO_ERROR: '',
  REQUIRED_VALUE: '필수 입력값입니다.',
  EXCEEDED_CURRENT_DATE: '다녀온 날짜는 오늘 이후일 수 없습니다.',
};

interface DateInputProps {
  prevDate?: string;
  wasSubmitted: boolean;
  onChange: (key: string, value: ValueOf<SubmitData>) => void;
}

const DateInput = ({ prevDate, wasSubmitted, onChange }: DateInputProps) => {
  const [date, setDate] = useState(prevDate ? moment(prevDate, 'YYYY-MM-DD') : undefined);
  const [errorMessage, setErrormessage] = useState(
    prevDate ? MESSAGE.NO_ERROR : MESSAGE.REQUIRED_VALUE,
  );
  const [clicked, setClicked] = useState(false);
  const displayErrorMessage = (wasSubmitted || clicked) && !!errorMessage;

  useEffect(() => {
    setDate(prevDate ? moment(prevDate, 'YYYY-MM-DD') : undefined);
    setErrormessage(prevDate ? MESSAGE.NO_ERROR : MESSAGE.REQUIRED_VALUE);
  }, [prevDate]);

  const handleChange = (value: moment.Moment | null) => {
    setClicked(true);
    if (validate(value) && value) {
      setDate(value);
      onChange('date', value.format('YYYY-MM-DD'));
    } else {
      setDate(undefined);
    }
  };

  const validate = (value: moment.Moment | null) => {
    if (!value) {
      setErrormessage(MESSAGE.REQUIRED_VALUE);
      return false;
    }
    if (value && new Date(value.format('YYYY-MM-DD')) > new Date()) {
      setErrormessage(MESSAGE.EXCEEDED_CURRENT_DATE);
      return false;
    }
    setErrormessage(MESSAGE.NO_ERROR);
    return true;
  };

  return (
    <>
      <DateSelect value={date} onChange={handleChange} />
      <ErrorMessage visible={displayErrorMessage}>{errorMessage}</ErrorMessage>
    </>
  );
};

const DateSelect = styled(DatePicker)`
  width: 200px;

  & > input {
    font-size: 1.6rem;
  }
`;

const ErrorMessage = styled.p<{
  visible: boolean;
}>`
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  margin-top: 2px;
  color: #ff4d4f;
  font-size: 1.4rem;
  height: 16px;
`;

export default DateInput;
