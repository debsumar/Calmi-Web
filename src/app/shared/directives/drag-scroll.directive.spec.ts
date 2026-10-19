// @vitest-environment jsdom
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DragScrollDirective } from './drag-scroll.directive';

@Component({
  imports: [DragScrollDirective],
  template: `<div appDragScroll id="slider" style="scroll-snap-type: x proximity"><a href="#x" id="link">item</a></div>`,
})
class HostComponent {}

function mouse(type: string, pageX: number, pageY = 0): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pageX', { value: pageX });
  Object.defineProperty(event, 'pageY', { value: pageY });
  return event;
}

function touch(type: string, pageX: number, pageY: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ pageX, pageY }] });
  return event;
}

describe('DragScrollDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let slider: HTMLElement;
  let scrollLeft: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    slider = fixture.nativeElement.querySelector('#slider') as HTMLElement;

    scrollLeft = 100;
    Object.defineProperty(slider, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => { scrollLeft = value; },
    });
    Object.defineProperty(slider, 'scrollWidth', { configurable: true, value: 1000 });
    Object.defineProperty(slider, 'clientWidth', { configurable: true, value: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('makes the scroller keyboard reachable and keeps vertical touch panning native', () => {
    expect(slider.getAttribute('tabindex')).toBe('0');
    expect(slider.style.touchAction).toBe('pan-y');
  });

  it('prevents default and scrolls for a horizontal touch drag', () => {
    slider.dispatchEvent(touch('touchstart', 100, 100));
    const move = touch('touchmove', 80, 102);
    slider.dispatchEvent(move);

    expect(move.defaultPrevented).toBe(true);
    expect(scrollLeft).toBe(100 + 40);
  });

  it('does not prevent default or scroll for a vertical touch gesture', () => {
    slider.dispatchEvent(touch('touchstart', 100, 100));
    const move = touch('touchmove', 102, 160);
    slider.dispatchEvent(move);
    const second = touch('touchmove', 110, 220);
    slider.dispatchEvent(second);

    expect(move.defaultPrevented).toBe(false);
    expect(second.defaultPrevented).toBe(false);
    expect(scrollLeft).toBe(100);
  });

  it('ends the drag on touchcancel', () => {
    slider.dispatchEvent(touch('touchstart', 100, 100));
    expect(slider.style.cursor).toBe('grabbing');
    slider.dispatchEvent(touch('touchcancel', 100, 100));
    expect(slider.style.cursor).toBe('grab');
  });

  it('suppresses the click that follows a real drag but not a plain click', () => {
    const link = slider.querySelector('#link') as HTMLAnchorElement;
    const clicked = vi.fn();
    link.addEventListener('click', clicked);

    slider.dispatchEvent(mouse('mousedown', 100));
    slider.dispatchEvent(mouse('mousemove', 60));
    slider.dispatchEvent(mouse('mouseup', 60));
    const afterDrag = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(afterDrag);
    expect(afterDrag.defaultPrevented).toBe(true);
    expect(clicked).not.toHaveBeenCalled();

    slider.dispatchEvent(mouse('mousedown', 100));
    slider.dispatchEvent(mouse('mouseup', 100));
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('restores the previous scroll-snap-type instead of forcing x mandatory', () => {
    slider.dispatchEvent(mouse('mousedown', 100));
    expect(slider.style.scrollSnapType).toBe('none');
    slider.dispatchEvent(mouse('mouseup', 100));
    expect(slider.style.scrollSnapType).toBe('x proximity');
  });

  it('scrolls with ArrowRight / ArrowLeft for keyboard users', () => {
    slider.scrollBy = vi.fn() as unknown as typeof slider.scrollBy;
    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    slider.dispatchEvent(right);
    expect(right.defaultPrevented).toBe(true);
    expect(slider.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 160 }));

    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(slider.scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -160 }));
  });

  it('clears the spring-back timer on destroy and removes the exact registered handlers', () => {
    vi.useFakeTimers();
    const addSpy = vi.spyOn(slider, 'addEventListener');
    const removeSpy = vi.spyOn(slider, 'removeEventListener');
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    // Overscroll left so a spring-back timer is pending.
    scrollLeft = 0;
    slider.dispatchEvent(mouse('mousedown', 100));
    slider.dispatchEvent(mouse('mousemove', 150));
    slider.dispatchEvent(mouse('mouseup', 150));
    expect(slider.style.transition).toContain('transform');

    fixture.destroy();

    expect(clearSpy).toHaveBeenCalled();
    expect(slider.style.transition).toBe('');
    // Handlers registered before the spy are covered by the behavioural check:
    slider.dispatchEvent(mouse('mousedown', 10));
    expect(slider.style.cursor).toBe('');
    expect(addSpy.mock.calls.length).toBe(0);
    expect(removeSpy.mock.calls.length).toBeGreaterThan(0);
    expect(removeSpy.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'click', 'keydown']),
    );
  });
});
