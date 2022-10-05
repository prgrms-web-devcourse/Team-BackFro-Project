import styled from '@emotion/styled';
import { Button, DatePicker, Form, Input, message, Switch, UploadFile, Image, Modal } from 'antd';
import { reviewAPI } from 'apis';
import { useDebounce } from 'hooks';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useRef, useState, useEffect } from 'react';
import { PhotoProps } from 'types/model';
import { ValueOf } from 'types/utility';
import {
  convertFilesToFormData,
  convertObjectToFormData,
  getErrorMessage,
  validateReviewEditForm,
} from 'utils';
import ExhibitionSearchBar from '../ExhibitionSearchBar';
import ImageUpload from '../ImageUpload';

export interface SubmitData {
  [key: string]: string | number | boolean | number[];
}

const initialData: SubmitData = {
  exhibitionId: 0,
  date: '',
  title: '',
  content: '',
  isPublic: true,
};
Object.freeze(initialData);

interface ReviewEditFormProps {
  type: 'create' | 'update';
  prevData?: {
    exhibitionId: number;
    exhibitionName: string;
    exhibitionThumbnail: string;
    date?: string;
    title?: string;
    content?: string;
    isPublic?: boolean;
    photos?: PhotoProps[];
  };
  onMutation?: (submitData: SubmitData, prevImages: PhotoProps[]) => void;
}

const ReviewEditForm = ({ type, prevData, onMutation }: ReviewEditFormProps) => {
  const submitData = useRef<SubmitData>({ ...initialData });
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [prevImages, setPrevImages] = useState<PhotoProps[]>([]);
  const [isModalOn, setIsModalOn] = useState(false);
  const clickedImage = useRef<number>(0);
  const router = useRouter();

  useEffect(() => {
    if (prevData) {
      submitData.current = {
        exhibitionId: prevData.exhibitionId,
        date: prevData.date || '',
        title: prevData.title || '',
        content: prevData.content || '',
        isPublic: prevData.isPublic || true,
      };

      if (type === 'update') {
        submitData.current = {
          ...submitData.current,
          deletedPhotos: [],
        };
        setPrevImages(prevData.photos || []);
      }
    }
  }, [prevData, type]);

  const handleChange = (key: string, value: ValueOf<SubmitData>) => {
    submitData.current[key] = value;
  };

  const handleSubmit = async (e?: Event) => {
    e?.preventDefault();
    if (isLoading) {
      return;
    }

    const data = submitData.current;
    if (validateReviewEditForm(data)) {
      setIsLoading(true);
      let formData = convertObjectToFormData('data', data);
      formData = convertFilesToFormData('files', files, formData);
      try {
        switch (type) {
          case 'create': {
            await reviewAPI.createReview(formData);
            message.success('후기 작성이 완료되었습니다.');
            break;
          }
          case 'update': {
            await reviewAPI.updateReview(Number(router.query.id), formData);
            message.success('후기 수정이 완료되었습니다.');
            onMutation && onMutation(data, prevImages);
            break;
          }
          default: {
            throw new TypeError('type의 값이 유효하지 않습니다.');
          }
        }
        router.replace('/community');
      } catch (error) {
        message.error(getErrorMessage(error));
        console.error(error);
      }
      setIsLoading(false);
    }
  };
  const [debounceRef] = useDebounce(handleSubmit, 300, null, 'click');

  const handleImageClick = (photoId: number) => {
    clickedImage.current = photoId;
    setIsModalOn(true);
  };

  const handleImageDelete = () => {
    const photoId = clickedImage.current;
    const { deletedPhotos } = submitData.current;
    deletedPhotos && (deletedPhotos as number[]).push(photoId);
    setPrevImages(prevImages.filter((image) => image.photoId !== photoId));
    setIsModalOn(false);
  };

  const handleModalCancel = () => {
    clickedImage.current = 0;
    setIsModalOn(false);
  };

  useEffect(() => {
    return () => {
      if (type === 'create' && submitData.current.exhibitionId) {
        console.log('임시 저장', submitData.current);
      }
    };
  }, [type]);

  return (
    <>
      <EditForm layout="vertical">
        <FormItem label="다녀 온 전시회">
          <ExhibitionSearchBar
            prevData={
              prevData
                ? {
                    name: prevData.exhibitionName,
                    thumbnail: prevData.exhibitionThumbnail,
                  }
                : undefined
            }
            onExhibitionChange={handleChange}
          />
        </FormItem>
        <FormItem label="다녀 온 날짜">
          <DateInput
            onChange={(value) => {
              value && handleChange('date', value.format('YYYY-MM-DD'));
            }}
            defaultValue={prevData?.date ? moment(prevData.date, 'YYYY-MM-DD') : undefined}
          />
        </FormItem>
        <FormItem label="제목">
          <Input
            placeholder="제목을 입력해주세요"
            showCount
            maxLength={30}
            onChange={(e) => {
              handleChange('title', e.target.value);
            }}
            defaultValue={prevData?.title || undefined}
          />
        </FormItem>
        <FormItem label="내용">
          <TextArea
            placeholder="내용을 입력해주세요(1000자 이하)"
            autoSize
            onChange={(e) => {
              handleChange('content', e.target.value);
            }}
            defaultValue={prevData?.content || undefined}
          />
        </FormItem>
        <FormItem label="사진">
          {type === 'update' && (
            <PrevImageContainer>
              {prevImages.map(({ photoId, path }) => (
                <Image
                  key={photoId}
                  src={path}
                  alt="previous image"
                  width={104}
                  height={104}
                  preview={false}
                  onClick={() => handleImageClick(photoId)}
                />
              ))}
            </PrevImageContainer>
          )}
          <ImageUpload fileList={files} setFileList={setFiles} limit={9 - prevImages.length} />
        </FormItem>
        <FormItem label="공개 여부">
          <ToggleSwitch
            defaultChecked={prevData?.isPublic === undefined ? true : prevData.isPublic}
            onChange={(checked) => {
              handleChange('isPublic', checked);
              setIsPublic(checked);
            }}
          />
          {isPublic ? '전체 공개' : '비공개'}
        </FormItem>

        <SubmitButton type="primary" ref={debounceRef}>
          작성완료
        </SubmitButton>
      </EditForm>
      <Modal
        title="이미지 삭제"
        visible={isModalOn}
        okText="삭제하기"
        onOk={handleImageDelete}
        cancelText="취소"
        onCancel={handleModalCancel}
      >
        <p>이 이미지를 삭제할까요?</p>
      </Modal>
    </>
  );
};

const EditForm = styled(Form)`
  display: flex;
  flex-direction: column;
  margin: 50px 0;

  label {
    font-size: 2rem;
    font-weight: bold;
  }
`;

const FormItem = styled(Form.Item)`
  label[title='사진']::after {
    content: '(optional)';
    display: inline;
    color: ${({ theme }) => theme.color.font.dark};
    font-size: 1.2rem;
    font-weight: 400;
    margin-top: 2px;
    margin-left: 4px;
  }
`;

const DateInput = styled(DatePicker)`
  width: 200px;

  & > input {
    font-size: 1.6rem;
  }
`;

const TextArea = styled(Input.TextArea)``;

const PrevImageContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 104px);
  gap: 8px;
  margin-bottom: 8px;

  img {
    cursor: pointer;
  }
`;

const ToggleSwitch = styled(Switch)`
  width: 54px;
  margin-right: 14px;
`;

const SubmitButton = styled(Button)`
  width: 200px;
  height: 40px;
  border-radius: 6px;
  margin: 30px auto 0;
  font-size: 1.8rem;
`;

export default ReviewEditForm;
