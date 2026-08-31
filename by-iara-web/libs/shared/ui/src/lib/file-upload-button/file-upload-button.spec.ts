import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadButton } from './file-upload-button';

describe('FileUploadButton', () => {
  let fixture: ComponentFixture<FileUploadButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadButton],
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadButton);
  });

  it('uses the shared primary button style by default', () => {
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label');
    expect(label.classList).toContain('btn');
    expect(label.classList).toContain('btn-primary');
  });

  it('disables the native input while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('label').classList).toContain(
      'is-disabled',
    );
  });
});
